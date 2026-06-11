/**
 * Action catalog and quick-log endpoints. Owns the HTTP flow and the ledger
 * update (points, streak, log append); all impact math stays in core. The
 * cumulative daily cap lives here because only the server sees the full log.
 */
import {
  actionLogRequestSchema,
  appError,
  calculateActionImpact,
  getActionById,
  levelForPoints,
  updateStreak,
  ACTION_CATALOG,
  type ActionLogEntry,
  type ActionLogRequest,
  type GamificationState,
  type UserState,
} from '@carbon-saathi/core';
import { Router } from 'express';
import { asyncHandler, parsedBody, sendError, validateBody } from '../middleware/validate';
import type { UserStore } from '../services/store';

// Mirrors the core gamificationStateSchema bound so a long-lived user can
// always be re-bootstrapped through validation after an API restart.
const MAX_LOG_ENTRIES = 5000;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function entriesOnDay(log: readonly ActionLogEntry[], dayISO: string): ActionLogEntry[] {
  return log.filter((entry) => entry.loggedAtISO.slice(0, 10) === dayISO);
}

export function createActionsRouter(store: UserStore, now: () => number): Router {
  const router = Router();

  router.get('/catalog', (_req, res) => {
    res.json({ actions: ACTION_CATALOG });
  });

  router.post(
    '/log',
    validateBody(actionLogRequestSchema),
    asyncHandler(async (_req, res) => {
      const body = parsedBody<ActionLogRequest>(res);
      const user = await store.getUser(body.userId);
      if (user === undefined) {
        sendError(res, appError('NOT_FOUND', 'Unknown userId — bootstrap first.'));
        return;
      }
      const definition = getActionById(body.actionId);
      if (definition === undefined) {
        // A bad actionId is a defective payload, not a missing REST resource —
        // 404 stays reserved for unknown routes and users.
        sendError(res, appError('VALIDATION_FAILED', 'Unknown actionId.'));
        return;
      }

      const nowISO = new Date(now()).toISOString();
      const todayISO = nowISO.slice(0, 10);
      // Anti-gaming: core caps a single request at maxPerDay; summing today's
      // prior logs stops replaying max-sized requests all day long.
      const alreadyToday = entriesOnDay(user.gamification.actionLog, todayISO)
        .filter((entry) => entry.actionId === body.actionId)
        .reduce((sum, entry) => sum + entry.quantity, 0);
      if (alreadyToday + body.quantity > definition.maxPerDay) {
        sendError(
          res,
          appError(
            'VALIDATION_FAILED',
            `Daily cap reached: ${definition.id} allows ${definition.maxPerDay} per day.`,
          ),
        );
        return;
      }

      const impact = calculateActionImpact(body.actionId, body.quantity);
      if (!impact.ok) {
        sendError(res, impact.error);
        return;
      }
      const streak = updateStreak(user.gamification.streak, nowISO);
      if (!streak.ok) {
        sendError(res, streak.error);
        return;
      }

      const entry: ActionLogEntry = {
        actionId: body.actionId,
        quantity: body.quantity,
        co2SavedKg: impact.value.co2SavedKg,
        points: impact.value.points,
        loggedAtISO: nowISO,
      };
      const gamification: GamificationState = {
        points: user.gamification.points + impact.value.points,
        totalCo2SavedKg: round2(user.gamification.totalCo2SavedKg + impact.value.co2SavedKg),
        streak: streak.value,
        actionLog: [...user.gamification.actionLog, entry].slice(-MAX_LOG_ENTRIES),
        earnedBadges: user.gamification.earnedBadges,
        pledge: user.gamification.pledge,
      };
      const updated: UserState = { ...user, gamification };
      await store.saveUser(updated);

      res.json({
        impact: impact.value,
        gamification: {
          points: gamification.points,
          totalCo2SavedKg: gamification.totalCo2SavedKg,
          streak: gamification.streak,
          level: levelForPoints(gamification.points),
        },
        todayLog: entriesOnDay(gamification.actionLog, todayISO),
      });
    }),
  );

  return router;
}
