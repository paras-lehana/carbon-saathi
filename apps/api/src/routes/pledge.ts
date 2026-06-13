/**
 * Daily pledge endpoint: records which single action the user commits to
 * today (IST). Re-pledging replaces the previous pledge. This route owns
 * pledge creation only — the action-log route detects completion and applies
 * the 1.2× bonus, flipping bonusApplied exactly once.
 */
import {
  appError,
  getActionById,
  pledgeRequestSchema,
  type DailyPledge,
  type UserState,
} from '@carbon-saathi/core';
import { Router } from 'express';
import { asyncHandler, parsedBody, sendError, validateBody } from '../middleware/validate';
import type { UserStore } from '../services/store';
import { istDayISO } from '../services/time';

export function createPledgeRouter(store: UserStore, now: () => number): Router {
  const router = Router();
  router.post(
    '/',
    validateBody(pledgeRequestSchema),
    asyncHandler(async (_req, res) => {
      const { userId, actionId } = parsedBody(res, pledgeRequestSchema);
      // Concurrency: pledge replacement rewrites the same gamification record
      // the action-log route updates, so it joins the per-user mutation queue
      // instead of racing it with a stale read.
      await store.mutateUser(userId, (user) => {
        if (user === undefined) {
          sendError(res, appError('NOT_FOUND', 'Unknown userId — bootstrap first.'));
          return undefined;
        }
        if (getActionById(actionId) === undefined) {
          // Same contract as the log route: a bad actionId is a defective
          // payload, not a missing resource — and never reflected back.
          sendError(res, appError('VALIDATION_FAILED', 'Unknown actionId.'));
          return undefined;
        }
        const pledge: DailyPledge = {
          actionId,
          dateISO: istDayISO(now()),
          bonusApplied: false,
        };
        // New object via spread: the in-memory store hands out live references,
        // and the Firestore store will hand out snapshots — never mutate either.
        const updated: UserState = {
          ...user,
          gamification: { ...user.gamification, pledge },
        };
        res.json({ pledge });
        return updated;
      });
    }),
  );
  return router;
}
