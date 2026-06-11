/**
 * Government scheme endpoints (PM Surya Ghar, PM-KUSUM): validate, delegate
 * to core, translate Result to HTTP. No scheme math lives here.
 */
import {
  adviseKusum,
  calculateSuryaGhar,
  kusumInputSchema,
  suryaGharInputSchema,
  type KusumInput,
  type SuryaGharInput,
} from '@carbon-saathi/core';
import { Router } from 'express';
import { parsedBody, sendError, validateBody } from '../middleware/validate';

export function createSchemesRouter(): Router {
  const router = Router();

  router.post('/surya-ghar', validateBody(suryaGharInputSchema), (_req, res) => {
    const result = calculateSuryaGhar(parsedBody<SuryaGharInput>(res));
    if (!result.ok) {
      sendError(res, result.error);
      return;
    }
    res.json({ result: result.value });
  });

  router.post('/kusum', validateBody(kusumInputSchema), (_req, res) => {
    const result = adviseKusum(parsedBody<KusumInput>(res));
    if (!result.ok) {
      sendError(res, result.error);
      return;
    }
    res.json({ result: result.value });
  });

  return router;
}
