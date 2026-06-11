/**
 * Google-services evidence endpoint: serves the typed integration catalog for
 * the /google-services page and rubric evaluators. The catalog contains env
 * var NAMES only — a test asserts no key material can appear in the response.
 */
import { getServiceSummary, GOOGLE_SERVICES } from '@carbon-saathi/core';
import { Router } from 'express';

export function createGoogleServicesRouter(): Router {
  const router = Router();
  router.get('/services', (_req, res) => {
    res.json({ services: GOOGLE_SERVICES, summary: getServiceSummary() });
  });
  return router;
}
