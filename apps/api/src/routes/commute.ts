/**
 * Commute comparison endpoint: resolves a distance (Maps Distance Matrix when
 * configured, deterministic estimate otherwise) and runs the core per-mode
 * calculator. The `source` field tells clients which path served them.
 */
import {
  commuteCompareRequestSchema,
  estimateCommuteModes,
  type CommuteCompareRequest,
} from '@carbon-saathi/core';
import { Router } from 'express';
import type { AppConfig } from '../config';
import { asyncHandler, parsedBody, sendError, validateBody } from '../middleware/validate';
import { resolveDistanceKm } from '../services/maps-client';

export function createCommuteRouter(config: AppConfig, fetchFn?: typeof fetch): Router {
  const router = Router();
  router.post(
    '/compare',
    validateBody(commuteCompareRequestSchema),
    asyncHandler(async (_req, res) => {
      const body = parsedBody<CommuteCompareRequest>(res);
      const resolution = await resolveDistanceKm({
        // Demo mode forces the deterministic path even when a key is present.
        apiKey: config.demoMode ? undefined : config.mapsApiKey,
        distanceKm: body.distanceKm,
        origin: body.origin,
        destination: body.destination,
        fetchFn,
      });
      const modes = estimateCommuteModes(resolution.distanceKm);
      if (!modes.ok) {
        sendError(res, modes.error);
        return;
      }
      res.json({
        modes: modes.value,
        source: resolution.source,
        distanceKm: resolution.distanceKm,
      });
    }),
  );
  return router;
}
