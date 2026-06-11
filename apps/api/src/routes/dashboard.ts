/**
 * Dashboard aggregate: one GET returns everything the bento grid needs, so
 * the page paints with a single round trip. Owns suggestion selection and the
 * week window; all scoring math stays in core.
 */
import {
  appError,
  evaluateMissions,
  impactAnalogies,
  ACTION_CATALOG,
  type ActionCategory,
  type ActionDefinition,
  type FootprintCategory,
} from '@carbon-saathi/core';
import { Router } from 'express';
import { asyncHandler, sendError } from '../middleware/validate';
import { summarizeGamification } from '../services/gamification-view';
import type { UserStore } from '../services/store';
import { istWeekStartISO } from '../services/time';

const SUGGESTION_COUNT = 3;
const RECENT_ACTIONS_COUNT = 10;

// Footprint categories map onto the action catalog's category axis so the
// suggested actions attack the user's biggest emission driver first.
const DRIVER_TO_CATEGORY: Record<FootprintCategory, ActionCategory> = {
  homeEnergy: 'energy',
  transport: 'transport',
  food: 'food',
  shopping: 'lifestyle',
};

function pickSuggestions(topDriver: FootprintCategory | undefined): ActionDefinition[] {
  const preferred =
    topDriver !== undefined
      ? ACTION_CATALOG.filter((action) => action.category === DRIVER_TO_CATEGORY[topDriver])
      : [];
  // Some categories hold only two actions — pad from the catalog head so the
  // card always shows exactly three, deterministically.
  const padded = [...preferred, ...ACTION_CATALOG.filter((action) => !preferred.includes(action))];
  return padded.slice(0, SUGGESTION_COUNT);
}

export function createDashboardRouter(store: UserStore, now: () => number): Router {
  const router = Router();
  router.get(
    '/:userId',
    asyncHandler(async (req, res) => {
      // Express 5 typings widen params to string|string[]; route shape guarantees a single segment.
      const user = await store.getUser(String(req.params.userId));
      if (user === undefined) {
        sendError(res, appError('NOT_FOUND', 'Unknown userId — bootstrap first.'));
        return;
      }
      const missions = evaluateMissions(user.gamification.actionLog, istWeekStartISO(now()));
      if (!missions.ok) {
        sendError(res, missions.error);
        return;
      }
      res.json({
        baseline: user.baseline ?? null,
        gamification: summarizeGamification(user.gamification),
        missions: missions.value,
        recentActions: [...user.gamification.actionLog].slice(-RECENT_ACTIONS_COUNT).reverse(),
        suggestions: pickSuggestions(user.baseline?.topDriver),
        analogies: impactAnalogies(user.gamification.totalCo2SavedKg),
      });
    }),
  );
  return router;
}
