/**
 * 30-second quiz estimate endpoint. Owns only the HTTP flow: answer
 * validation happens in validateBody (quizAnswersSchema) and all footprint
 * math stays in core's estimateFromQuiz. Stateless — persisting the result
 * is the bootstrap endpoint's job, with the survey the client sends back.
 */
import { estimateFromQuiz, quizEstimateRequestSchema } from '@carbon-saathi/core';
import { Router } from 'express';
import { parsedBody, sendError, validateBody } from '../middleware/validate';

export function createQuizRouter(): Router {
  const router = Router();
  // Synchronous handler: estimateFromQuiz is pure CPU, no awaits to wrap.
  router.post('/estimate', validateBody(quizEstimateRequestSchema), (_req, res) => {
    const { answers } = parsedBody(res, quizEstimateRequestSchema);
    const estimate = estimateFromQuiz(answers);
    // An err here means the quiz defaults breached a calculator bound — a
    // programming error surfaced honestly rather than masked as a 500.
    if (!estimate.ok) {
      sendError(res, estimate.error);
      return;
    }
    res.json({ baseline: estimate.value.baseline, survey: estimate.value.survey });
  });
  return router;
}
