/**
 * Baseline footprint endpoint: validates the lifestyle survey and delegates
 * all math to core. Owns nothing but the HTTP translation.
 */
import {
  baselineSurveySchema,
  calculateBaselineFootprint,
  type BaselineSurveyInput,
} from '@carbon-saathi/core';
import { Router } from 'express';
import { parsedBody, sendError, validateBody } from '../middleware/validate';

export function createFootprintRouter(): Router {
  const router = Router();
  router.post('/baseline', validateBody(baselineSurveySchema), (_req, res) => {
    const result = calculateBaselineFootprint(parsedBody<BaselineSurveyInput>(res));
    if (!result.ok) {
      sendError(res, result.error);
      return;
    }
    res.json({ baseline: result.value });
  });
  return router;
}
