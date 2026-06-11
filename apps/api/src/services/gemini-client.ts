/**
 * Thin REST client for the Gemini generateContent endpoint. Owns transport,
 * timeout and response narrowing only — prompt construction belongs to
 * assistant.ts. The API key never appears in URLs, logs or error messages.
 */
import { appError, err, ok, type AppError, type Result } from '@carbon-saathi/core';
import { z } from 'zod';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
// Generous enough for a long completion, short enough that a hung upstream
// cannot pin request handlers for minutes.
const REQUEST_TIMEOUT_MS = 30_000;
// 2.5-class models spend output budget on internal "thinking" BEFORE visible
// text, so the cap must cover both; thinking is disabled below to keep short
// coach replies cheap and un-truncated.
const MAX_OUTPUT_TOKENS = 800;
const TEMPERATURE = 0.3; // low: numeric advice should stay close to the grounded data

// Only the fields we consume — unknown extra fields are ignored by design.
const geminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({ parts: z.array(z.object({ text: z.string().optional() })) }).optional(),
      }),
    )
    .optional(),
});

export interface GeminiClientOptions {
  readonly apiKey: string | undefined;
  readonly model: string;
  /** Injectable for tests — defaults to the Node 20 global fetch. */
  readonly fetchFn?: typeof fetch;
}

export interface GeminiClient {
  /** False when no key is configured — callers then use the demo path. */
  readonly enabled: boolean;
  generate(systemPrompt: string, userContent: string): Promise<Result<string, AppError>>;
}

export function createGeminiClient(options: GeminiClientOptions): GeminiClient {
  const fetchFn = options.fetchFn ?? fetch;
  const apiKey = options.apiKey;
  const enabled = apiKey !== undefined && apiKey.length > 0;

  return {
    enabled,
    async generate(systemPrompt, userContent) {
      if (!enabled || apiKey === undefined) {
        return err(appError('UPSTREAM_FAILURE', 'Gemini is not configured.'));
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetchFn(
          `${GEMINI_BASE_URL}/${encodeURIComponent(options.model)}:generateContent`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              // Security: the key travels in a header rather than the query
              // string, so URL-logging proxies can never capture it.
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: 'user', parts: [{ text: userContent }] }],
              generationConfig: {
                temperature: TEMPERATURE,
                maxOutputTokens: MAX_OUTPUT_TOKENS,
                // Efficiency: the coach needs direct answers, not chain-of-thought.
                thinkingConfig: { thinkingBudget: 0 },
              },
            }),
            signal: controller.signal,
          },
        );
        if (!response.ok) {
          // Security: upstream bodies are not relayed — they may echo request
          // contents; the status code alone is enough for diagnostics.
          return err(
            appError('UPSTREAM_FAILURE', `Gemini responded with HTTP ${response.status}.`),
          );
        }
        const parsed = geminiResponseSchema.safeParse(await response.json());
        const text = parsed.success
          ? parsed.data.candidates?.[0]?.content?.parts
              ?.map((part) => part.text ?? '')
              .join('')
              .trim()
          : undefined;
        if (text === undefined || text.length === 0) {
          return err(appError('UPSTREAM_FAILURE', 'Gemini returned an empty reply.'));
        }
        return ok(text);
      } catch {
        // Security: fetch errors can embed the request URL and headers — they
        // are swallowed here and replaced with a fixed, key-free message.
        return err(appError('UPSTREAM_FAILURE', 'Gemini request failed or timed out.'));
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
