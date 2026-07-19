/**
 * Failover composition over LLM transports. Saathi Chat's reliability story
 * is a three-step ladder — direct Gemini key, internal llm-service proxy,
 * grounded deterministic demo reply — and this module owns the first two
 * rungs. assistant.ts still owns the final demo fallback, so the chain
 * presents itself as one ordinary GeminiClient.
 *
 * WHY this exists: the 2026-06 evaluation found the chatbot down. Post-mortem
 * showed the single Gemini key had exhausted its prepaid credits and the code
 * silently degraded to demo mode. One transport = one point of failure; two
 * independent transports make a silent full-LLM outage require two unrelated
 * billing/infra failures at once.
 */
import { appError, err, type AppError, type Result } from '@carbon-saathi/core';
import type { GeminiClient } from './gemini-client';

export function createLlmChain(clients: readonly GeminiClient[]): GeminiClient {
  const active = clients.filter((client) => client.enabled);
  return {
    // The chain is "live" if ANY transport is — assistant.ts uses this to
    // decide between the LLM path and an immediate demo reply.
    enabled: active.length > 0,
    async generate(systemPrompt, userContent): Promise<Result<string, AppError>> {
      let lastError: Result<string, AppError> | undefined;
      for (const client of active) {
        const result = await client.generate(systemPrompt, userContent);
        if (result.ok) return result;
        lastError = result;
      }
      // Either no transport is configured or every one failed — the caller's
      // graceful-degradation contract (demo reply, never a 502) takes over.
      return lastError ?? err(appError('UPSTREAM_FAILURE', 'No LLM transport is configured.'));
    },
  };
}
