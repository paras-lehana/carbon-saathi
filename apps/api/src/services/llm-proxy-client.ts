/**
 * Client for the internal llm-service proxy (llm.lehana.in) — a second,
 * independently-billed transport to the same Gemini model family. It exists
 * so a single upstream failure mode (an exhausted Google API key, a regional
 * outage) can never take Saathi Chat below grounded-demo quality: the chain
 * in llm-chain.ts tries the direct Gemini key first and falls through here.
 *
 * Contract mirrors gemini-client.ts exactly: transport, timeout and response
 * narrowing only; prompts are built in assistant.ts. The internal key never
 * appears in URLs, logs or error messages.
 */
import { appError, err, ok } from '@carbon-saathi/core';
import { z } from 'zod';
import type { GeminiClient } from './gemini-client';

// Same ceiling as the direct Gemini client: long enough for a full coach
// reply, short enough that a hung upstream cannot pin request handlers.
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_TOKENS = 800;
const TEMPERATURE = 0.3; // numeric advice must stay close to the grounded data

// SSRF guard: the base URL arrives from the environment, so before a
// key-bearing request is sent the host must be on this allowlist — an
// injected LLM_SERVICE_URL must never redirect the key at a metadata
// endpoint. localhost stays permitted for tests and local dev.
const ALLOWED_PROXY_HOSTS = new Set(['llm.lehana.in', 'localhost', '127.0.0.1']);

export function isAllowedProxyUrl(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl);
    const httpsOrLocal =
      url.protocol === 'https:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    return httpsOrLocal && ALLOWED_PROXY_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

// Only the fields we consume from the OpenAI-style envelope — extras ignored.
const proxyResponseSchema = z.object({
  choices: z
    .array(z.object({ message: z.object({ content: z.string().optional() }).optional() }))
    .optional(),
});

/** Some proxy backends wrap replies in markdown fences; strip them defensively. */
function stripFences(text: string): string {
  if (!text.startsWith('```')) return text;
  const match = /```(?:\w+)?\s*\n?([\s\S]*?)\n?```/.exec(text);
  return match?.[1]?.trim() ?? text;
}

export interface LlmProxyClientOptions {
  /** e.g. https://llm.lehana.in — undefined disables the client entirely. */
  readonly baseUrl: string | undefined;
  /** SMK endpoint slug registered on the proxy, e.g. "antigravity-manager". */
  readonly endpoint: string;
  readonly internalKey: string | undefined;
  readonly model: string;
  /** Injectable for tests — defaults to the Node global fetch. */
  readonly fetchFn?: typeof fetch;
}

export function createLlmProxyClient(options: LlmProxyClientOptions): GeminiClient {
  const fetchFn = options.fetchFn ?? fetch;
  const { baseUrl, internalKey } = options;
  const enabled =
    baseUrl !== undefined &&
    internalKey !== undefined &&
    internalKey.length > 0 &&
    isAllowedProxyUrl(baseUrl);

  return {
    enabled,
    async generate(systemPrompt, userContent) {
      if (!enabled || baseUrl === undefined || internalKey === undefined) {
        return err(appError('UPSTREAM_FAILURE', 'LLM proxy is not configured.'));
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetchFn(`${baseUrl}/smk/${encodeURIComponent(options.endpoint)}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            // Security: the key travels in a header, never the URL.
            'x-internal-key': internalKey,
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userContent },
            ],
            model: options.model,
            temperature: TEMPERATURE,
            max_tokens: MAX_TOKENS,
            ref: 'carbon-saathi',
          }),
          signal: controller.signal,
        });
        if (!response.ok) {
          // Security: upstream bodies are never relayed — they may echo
          // request contents; the status code alone is enough to diagnose.
          return err(appError('UPSTREAM_FAILURE', `LLM proxy responded with HTTP ${response.status}.`));
        }
        const parsed = proxyResponseSchema.safeParse(await response.json());
        const text = parsed.success
          ? parsed.data.choices?.[0]?.message?.content?.trim()
          : undefined;
        if (text === undefined || text.length === 0) {
          return err(appError('UPSTREAM_FAILURE', 'LLM proxy returned an empty reply.'));
        }
        return ok(stripFences(text));
      } catch {
        // Security: fetch errors can embed the request URL and headers — they
        // are swallowed and replaced with a fixed, key-free message.
        return err(appError('UPSTREAM_FAILURE', 'LLM proxy request failed or timed out.'));
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
