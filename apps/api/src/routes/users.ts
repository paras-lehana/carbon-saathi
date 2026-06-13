/**
 * User bootstrap: creates a fresh anonymous profile or restores one the
 * client mirrored in localStorage (resilience against API restarts with the
 * in-memory store). No PII is required — display names are optional. Owns
 * the first badge evaluation (quiz-whiz / pehla-kadam) since arrival context
 * (source) only exists here.
 */
import { randomUUID } from 'node:crypto';
import {
  bootstrapRequestSchema,
  evaluateBadges,
  round2,
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

/**
 * Anti-minting clamp: the restore path exists so a mirrored state survives an
 * API restart, not so one curl can claim a #1 leaderboard score. Points and
 * CO2 are capped at what the submitted actionLog actually adds up to — a
 * legitimate mirror always passes, a fabricated total gets clamped.
 */
function clampToLedger(gamification: GamificationState): GamificationState {
  const ledgerPoints = gamification.actionLog.reduce((sum, entry) => sum + entry.points, 0);
  const ledgerCo2 = round2(
    gamification.actionLog.reduce((sum, entry) => sum + entry.co2SavedKg, 0),
  );
  return {
    ...gamification,
    points: Math.min(gamification.points, ledgerPoints),
    totalCo2SavedKg: Math.min(gamification.totalCo2SavedKg, ledgerCo2),
  };
}

/** Badge ids earned at arrival time, appended to whatever the state carries. */
function withBootstrapBadges(
  gamification: GamificationState,
  body: BootstrapRequest,
): GamificationState {
  const newBadges = evaluateBadges({
    earnedBadges: gamification.earnedBadges,
    hasBaseline: body.baseline !== undefined,
    joinedViaQuiz: body.source === 'quiz',
    actionCount: gamification.actionLog.length,
    streakCurrent: gamification.streak.current,
    totalCo2SavedKg: gamification.totalCo2SavedKg,
    missionCompleted: false, // missions are evaluated only at log time
    pledgeCompleted: false,
  });
  if (newBadges.length === 0) return gamification;
  return {
    ...gamification,
    earnedBadges: [...gamification.earnedBadges, ...newBadges.map((badge) => badge.id)],
  };
}

export function createUsersRouter(store: UserStore, now: () => number): Router {
  const router = Router();
  router.post(
    '/bootstrap',
    validateBody(bootstrapRequestSchema),
    asyncHandler(async (_req, res) => {
      const body = parsedBody(res, bootstrapRequestSchema);
      // randomUUID is fine here: identity minting is an API-layer concern,
      // never domain math (which stays deterministic).
      const userId = body.userId ?? randomUUID();
      // Concurrency: create-or-restore reads then writes the same record, so
      // it runs as one serialized per-user mutation — two parallel bootstraps
      // for one userId cannot both take the create branch and clobber state.
      await store.mutateUser(userId, (existing) => {
        if (existing !== undefined) {
          // Server state wins over the client mirror — it is the points ledger
          // of record; only missing context is adopted from the client.
          const merged: UserState = {
            ...existing,
            baseline: existing.baseline ?? body.baseline,
            survey: existing.survey ?? body.survey,
            joinedVia: existing.joinedVia ?? body.source,
          };
          const withBadges: UserState = {
            ...merged,
            gamification: withBootstrapBadges(merged.gamification, body),
          };
          res.json(withBadges);
          return withBadges;
        }
        const restored =
          body.gamification !== undefined ? clampToLedger(body.gamification) : undefined;
        const user: UserState = {
          userId,
          displayName: body.displayName ?? 'Saathi',
          createdAtISO: new Date(now()).toISOString(),
          baseline: body.baseline,
          survey: body.survey,
          joinedVia: body.source,
          gamification: emptyGamification(),
        };
        const withState: UserState = {
          ...user,
          gamification: withBootstrapBadges(restored ?? user.gamification, body),
        };
        res.json(withState);
        return withState;
      });
    }),
  );
  return router;
}
