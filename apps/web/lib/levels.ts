/**
 * Presentation-only helpers over core's level ladder. The engine —
 * thresholds, progress math, the floor-not-round rule — lives solely in
 * @carbon-saathi/core (gamification.ts); this file re-exports it and adds
 * the one lookup the UI needs that core does not ship.
 */
import { levelForPoints, LEVELS } from '@carbon-saathi/core';

export { levelForPoints as levelProgressForPoints };

/** Icon for a level name string (e.g. leaderboard entries). Seed is the safe default. */
export function levelIconForName(name: string): string {
  return LEVELS.find((level) => level.name === name)?.icon ?? LEVELS[0].icon;
}
