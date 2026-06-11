/**
 * User bootstrap: creates a fresh anonymous profile or restores one the
 * client mirrored in localStorage (resilience against API restarts with the
 * in-memory store). No PII is required — display names are optional.
 */
import { randomUUID } from 'node:crypto';
import {
  bootstrapRequestSchema,
  type BootstrapRequest,
  type GamificationState,
  type UserState,
} from '@carbon-saathi/core';
import { Router } from 'express';
import { asyncHandler, parsedBody, validateBody } from '../middleware/validate';
import type { UserStore } from '../services/store';

function emptyGamification(): GamificationState {
  return {
    points: 0,
    totalCo2SavedKg: 0,
    streak: { current: 0, longest: 0, shields: 0, lastLogDateISO: null },
    actionLog: [],
    earnedBadges: [],
    pledge: null,
  };
}

export function createUsersRouter(store: UserStore, now: () => number): Router {
  const router = Router();
  router.post(
    '/bootstrap',
    validateBody(bootstrapRequestSchema),
    asyncHandler(async (_req, res) => {
      const body = parsedBody<BootstrapRequest>(res);
      if (body.userId !== undefined) {
        const existing = await store.getUser(body.userId);
        if (existing !== undefined) {
          // Server state wins over the client mirror — it is the points ledger
          // of record; only a missing baseline is adopted from the client.
          if (existing.baseline === undefined && body.baseline !== undefined) {
            const merged: UserState = { ...existing, baseline: body.baseline };
            await store.saveUser(merged);
            res.json(merged);
            return;
          }
          res.json(existing);
          return;
        }
      }
      const user: UserState = {
        // randomUUID is fine here: identity minting is an API-layer concern,
        // never domain math (which stays deterministic).
        userId: body.userId ?? randomUUID(),
        displayName: body.displayName ?? 'Saathi',
        createdAtISO: new Date(now()).toISOString(),
        baseline: body.baseline,
        gamification: body.gamification ?? emptyGamification(),
      };
      await store.saveUser(user);
      res.json(user);
    }),
  );
  return router;
}
