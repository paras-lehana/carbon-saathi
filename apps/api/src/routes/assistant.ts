/**
 * Saathi Chat endpoint: validation, a stricter per-IP rate bucket (LLM calls
 * are the costliest thing the API does), then the grounding pipeline in
 * services/assistant.ts. Raw user messages never reach the logs.
 */
import { assistantQueryRequestSchema } from '@carbon-saathi/core';
import { Router } from 'express';
import type { AppConfig } from '../config';
import { createRateLimiter } from '../middleware/rate-limit';
import { asyncHandler, parsedBody, validateBody } from '../middleware/validate';
import { answerAssistantQuery } from '../services/assistant';
import type { GeminiClient } from '../services/gemini-client';
import type { UserStore } from '../services/store';

export interface AssistantRouterDeps {
  readonly config: AppConfig;
  readonly store: UserStore;
  readonly gemini: GeminiClient;
  readonly now?: () => number;
}

export function createAssistantRouter(deps: AssistantRouterDeps): Router {
  const router = Router();
  router.post(
    '/query',
    createRateLimiter({
      capacity: deps.config.assistantRateLimitMax,
      windowMs: deps.config.rateLimitWindowMs,
      now: deps.now,
    }),
    validateBody(assistantQueryRequestSchema),
    asyncHandler(async (_req, res) => {
      const body = parsedBody(res, assistantQueryRequestSchema);
      const answer = await answerAssistantQuery(
        { config: deps.config, store: deps.store, gemini: deps.gemini },
        body,
      );
      res.json(answer);
    }),
  );
  return router;
}
