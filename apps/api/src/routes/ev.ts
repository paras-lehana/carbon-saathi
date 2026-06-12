/**
 * EV-fit endpoint: validates the wizard payload and delegates the decision
 * tree to core. HTTP translation only.
 */
import { calculateEvFit, evFitInputSchema } from '@carbon-saathi/core';
import { Router } from 'express';
import { parsedBody, sendError, validateBody } from '../middleware/validate';

export function createEvRouter(): Router {
  const router = Router();
  router.post('/fit', validateBody(evFitInputSchema), (_req, res) => {
    const result = calculateEvFit(parsedBody(res, evFitInputSchema));
    if (!result.ok) {
      sendError(res, result.error);
      return;
    }
    res.json({ result: result.value });
  });
  return router;
}
