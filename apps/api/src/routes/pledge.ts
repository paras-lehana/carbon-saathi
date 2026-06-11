/**
 * POST /api/pledge — set a daily commitment to log a specific action.
 * One pledge per (userId, date) pair; replaces on retry. On completion,
 * the action log endpoint applies a 1.2× bonus and marks bonusApplied.
 */
import { appError, getActionById, pledgeRequestSchema } from '@carbon-saathi/core';
import { Router } from 'express';
import type { UserStore } from '../services/store';
import { asyncHandler, sendError, validateBody } from '../middleware/validate';

export function createPledgeRouter(store: UserStore) {
  const router = Router();

  router.post(
    '/',
    validateBody(pledgeRequestSchema),
    asyncHandler(async (_req, res) => {
      const { userId, actionId } = res.locals.body;

      const user = await store.getUser(userId);
      if (!user) {
        return sendError(res, appError('NOT_FOUND', 'User not found'));
      }

      // Validate action exists.
      if (!getActionById(actionId)) {
        return sendError(res, appError('NOT_FOUND', `Action ${actionId} not found`));
      }

      const today = new Date().toISOString().slice(0, 10);
      const pledge = {
        actionId,
        dateISO: today,
        bonusApplied: false,
      };

      user.gamification.pledge = pledge;
      await store.saveUser(user);

      res.json({ ok: true, pledge });
    }),
  );

  return router;
}
