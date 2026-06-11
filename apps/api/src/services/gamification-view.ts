/**
 * The one wire shape for gamification summaries. Both the action-log and
 * dashboard responses serialise through this helper, so the contract cannot
 * fork between routes again (it drifted once: badges/pledge appeared on the
 * dashboard but not on log responses, wiping the client's local mirror).
 */
import { levelForPoints, type GamificationState, type LevelProgress } from '@carbon-saathi/core';

export interface GamificationSummary {
  points: number;
  totalCo2SavedKg: number;
  streak: GamificationState['streak'];
  earnedBadges: string[];
  pledge: GamificationState['pledge'];
  level: LevelProgress;
}

/** Trims the (potentially long) actionLog and pre-computes the level. */
export function summarizeGamification(state: GamificationState): GamificationSummary {
  return {
    points: state.points,
    totalCo2SavedKg: state.totalCo2SavedKg,
    streak: state.streak,
    earnedBadges: state.earnedBadges,
    pledge: state.pledge,
    level: levelForPoints(state.points),
  };
}
