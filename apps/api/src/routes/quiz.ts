/**
 * POST /api/quiz/estimate — 30-second footprint quiz answers → baseline estimate.
 * Stateless, deterministic, unauthenticated.
 */
import { estimateFromQuiz, quizEstimateRequestSchema, appError } from '@carbon-saathi/core';
import { Router } from 'express';
import { asyncHandler, validateBody, sendError } from '../middleware/validate';

export function createQuizRouter() {
  const router = Router();

  router.post(
    '/estimate',
    validateBody(quizEstimateRequestSchema),
    asyncHandler(async (_req, res) => {
      const answers = res.locals.body.answers;
      try {
        const { baseline, survey } = estimateFromQuiz(answers);
        res.json({ ok: true, baseline, survey });
      } catch (err) {
        sendError(res, appError('INTERNAL', 'Failed to estimate baseline'));
      }
    }),
  );

  return router;
}
