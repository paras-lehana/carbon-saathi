/**
 * Display-side mirror of core's level ladder (packages/core/src/gamification.ts).
 * Exists because the web bundle keeps '@carbon-saathi/core' imports type-only
 * (the package resolves to its built dist at runtime); core's unit tests remain
 * the source of truth and the e2e journey would surface any drift immediately.
 */
import type { LevelProgress } from '@carbon-saathi/core';

// Mirrors core LEVELS exactly — names, icons and point thresholds.
const LEVEL_STEPS = [
  { name: 'Seed', icon: '🌱', minPoints: 0 },
  { name: 'Sapling', icon: '🌿', minPoints: 500 },
  { name: 'Tree', icon: '🌳', minPoints: 2_000 },
  { name: 'Grove', icon: '🏞️', minPoints: 5_000 },
  { name: 'Forest', icon: '🌲', minPoints: 12_000 },
] as const;

/** Same algorithm as core's levelForPoints, including the floor-not-round rule. */
export function levelProgressForPoints(points: number): LevelProgress {
  const safePoints = Math.max(0, points);
  let index = 0;
  for (let i = 0; i < LEVEL_STEPS.length; i += 1) {
    if (safePoints >= LEVEL_STEPS[i].minPoints) index = i;
  }
  const level = LEVEL_STEPS[index];
  const next = index + 1 < LEVEL_STEPS.length ? LEVEL_STEPS[index + 1] : null;
  // floor (not round) so 99.9% never displays as a premature 100%.
  const progressPct =
    next === null
      ? 100
      : Math.floor(((safePoints - level.minPoints) / (next.minPoints - level.minPoints)) * 100);
  return {
    name: level.name,
    icon: level.icon,
    minPoints: level.minPoints,
    nextLevelAt: next === null ? null : next.minPoints,
    progressPct,
  };
}

/** Icon for a level name string (e.g. leaderboard entries). Seed is the safe default. */
export function levelIconForName(name: string): string {
  return LEVEL_STEPS.find((step) => step.name === name)?.icon ?? LEVEL_STEPS[0].icon;
}
