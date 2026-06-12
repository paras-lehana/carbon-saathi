/**
 * Action catalog and quick-log endpoints. Owns the HTTP flow and the ledger
 * update (points with pledge bonus, streak, log append, badge awards); all
 * impact math and badge rules stay in core. The cumulative daily cap lives
 * here because only the server sees the full log.
 */
import {
  actionLogRequestSchema,
  applyPledgeBonus,
  calculateActionImpact,
  evaluateBadges,
  evaluateMissions,
  getActionById,
  updateStreak,
  ACTION_CATALOG,
  appError,
  type ActionLogEntry,
  type DailyPledge,
  type GamificationState,
  type UserState,
} from '@carbon-saathi/core';
import { Router } from 'express';
import { asyncHandler, parsedBody, sendError, validateBody } from '../middleware/validate';
import { summarizeGamification } from '../services/gamification-view';
import type { UserStore } from '../services/store';
import { istDayISO, istWeekStartISO } from '../services/time';

// Mirrors the core gamificationStateSchema bound so a long-lived user can
// always be re-bootstrapped through validation after an API restart.
const MAX_LOG_ENTRIES = 5000;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Entries store UTC instants; day-bucketing converts each to its IST
// calendar date so caps and todayLog agree with istDayISO(now).
function entriesOnDay(log: readonly ActionLogEntry[], dayISO: string): ActionLogEntry[] {
  return log.filter((entry) => istDayISO(Date.parse(entry.loggedAtISO)) === dayISO);
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
      const body = parsedBody(res, actionLogRequestSchema);
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
      const todayISO = istDayISO(now());
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

      // Pledge payoff: completing today's pledged action earns the 1.2× bonus
      // exactly once — bonusApplied flips so a second log pays base points.
      const pledge = user.gamification.pledge;
      const pledgeHit =
        pledge !== null &&
        pledge.actionId === body.actionId &&
        pledge.dateISO === todayISO &&
        !pledge.bonusApplied;
      const awardedPoints = pledgeHit ? applyPledgeBonus(impact.value.points) : impact.value.points;
      const updatedPledge: DailyPledge | null = pledgeHit
        ? { ...pledge, bonusApplied: true }
        : pledge;

      const entry: ActionLogEntry = {
        actionId: body.actionId,
        quantity: body.quantity,
        co2SavedKg: impact.value.co2SavedKg,
        points: awardedPoints,
        loggedAtISO: nowISO,
      };
      const actionLog = [...user.gamification.actionLog, entry].slice(-MAX_LOG_ENTRIES);
      const totalCo2SavedKg = round2(user.gamification.totalCo2SavedKg + impact.value.co2SavedKg);

      // Badge evaluation runs on the post-update ledger; missions on the IST
      // week so mission-master lands the moment the closing log is saved.
      const missions = evaluateMissions(actionLog, istWeekStartISO(now()));
      const newBadges = evaluateBadges({
        earnedBadges: user.gamification.earnedBadges,
        hasBaseline: user.baseline !== undefined,
        joinedViaQuiz: user.joinedVia === 'quiz',
        actionCount: actionLog.length,
        streakCurrent: streak.value.current,
        totalCo2SavedKg,
        missionCompleted: missions.ok && missions.value.some((mission) => mission.completed),
        pledgeCompleted: pledgeHit,
      });

      const gamification: GamificationState = {
        points: user.gamification.points + awardedPoints,
        totalCo2SavedKg,
        streak: streak.value,
        actionLog,
        earnedBadges: [...user.gamification.earnedBadges, ...newBadges.map((badge) => badge.id)],
        pledge: updatedPledge,
      };
      const updated: UserState = { ...user, gamification };
      await store.saveUser(updated);

      res.json({
        impact: { ...impact.value, points: awardedPoints },
        gamification: summarizeGamification(gamification),
        todayLog: entriesOnDay(gamification.actionLog, todayISO),
        newBadges,
      });
    }),
  );

  return router;
}
