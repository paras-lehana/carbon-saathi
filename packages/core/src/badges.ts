/**
 * Badge catalog and pure evaluation rules. This module owns which badges
 * exist and when one qualifies; the API owns when evaluation runs (bootstrap
 * and action-log time) and persisting the earned ids on GamificationState.
 * Evaluation returns only newly earned badges — never repeats.
 */
import type { BadgeDefinition, BadgeEvaluationInput } from './types';

// Streak badge days deliberately bracket the shield economy in gamification.ts:
// 3 is the first habit signal, 7 matches SHIELD_EARN_INTERVAL_DAYS so the badge
// and the first shield land together — change one and reconsider the other.
const STREAK_BADGE_FIRST_DAYS = 3;
const STREAK_BADGE_WEEK_DAYS = 7;
// 10 kg ≈ a week of consistent logging at the catalog's typical 1-2 kg/action.
const SAVER_BADGE_KG = 10;

export const BADGE_CATALOG: readonly BadgeDefinition[] = [
  {
    id: 'quiz-whiz',
    name: 'Quiz Whiz',
    description: '30-second quiz completed',
    icon: '🧠',
    hint: 'Complete the quick quiz',
  },
  {
    id: 'pehla-kadam',
    name: 'Pehla Kadam',
    description: 'First step',
    icon: '👣',
    hint: 'Complete your full footprint baseline',
  },
  {
    id: 'pehli-jeet',
    name: 'Pehli Jeet',
    description: 'First action logged',
    icon: '🎯',
    hint: 'Log your first climate action',
  },
  {
    id: 'streak-3',
    name: 'Three Days Strong',
    description: 'Streak milestone',
    icon: '🔥',
    hint: 'Log actions on 3 consecutive days',
  },
  {
    id: 'streak-7',
    name: 'Weekly Warrior',
    description: 'Full week habit',
    icon: '⚡',
    hint: 'Log actions on 7 consecutive days',
  },
  {
    id: 'saver-10',
    name: 'Double-Digit Saver',
    description: '≥10 kg CO₂ saved',
    icon: '💚',
    hint: 'Save a total of 10+ kg CO₂ equivalent',
  },
  {
    id: 'mission-master',
    name: 'Mission Master',
    description: 'Weekly mission done',
    icon: '🎖️',
    hint: 'Complete a weekly mission',
  },
  {
    id: 'pledge-keeper',
    name: 'Pledge Keeper',
    description: 'Daily commitment',
    icon: '🤝',
    hint: "Complete today's pledged action",
  },
];

const BADGE_BY_ID: ReadonlyMap<string, BadgeDefinition> = new Map(
  BADGE_CATALOG.map((badge) => [badge.id, badge]),
);

// One row per badge: the rule is data, so adding a badge is a catalog entry
// plus one predicate — no branching logic to copy.
const BADGE_RULES: ReadonlyArray<{
  readonly id: string;
  readonly qualifies: (input: BadgeEvaluationInput) => boolean;
}> = [
  { id: 'quiz-whiz', qualifies: (input) => input.joinedViaQuiz },
  { id: 'pehla-kadam', qualifies: (input) => input.hasBaseline },
  { id: 'pehli-jeet', qualifies: (input) => input.actionCount >= 1 },
  { id: 'streak-3', qualifies: (input) => input.streakCurrent >= STREAK_BADGE_FIRST_DAYS },
  { id: 'streak-7', qualifies: (input) => input.streakCurrent >= STREAK_BADGE_WEEK_DAYS },
  { id: 'saver-10', qualifies: (input) => input.totalCo2SavedKg >= SAVER_BADGE_KG },
  { id: 'mission-master', qualifies: (input) => input.missionCompleted },
  { id: 'pledge-keeper', qualifies: (input) => input.pledgeCompleted },
];

/**
 * Pure badge evaluation: returns the definitions of badges newly earned by
 * this input, excluding anything already in earnedBadges. Idempotent — a
 * second call with the returned ids appended yields []. Multiple badges can
 * land in one call (e.g. a 7-day streak with none earned returns both streak
 * badges).
 */
export function evaluateBadges(input: BadgeEvaluationInput): BadgeDefinition[] {
  const earned = new Set(input.earnedBadges);
  const newBadges: BadgeDefinition[] = [];
  for (const rule of BADGE_RULES) {
    if (earned.has(rule.id) || !rule.qualifies(input)) continue;
    const badge = BADGE_BY_ID.get(rule.id);
    // A rule without a catalog entry is a programming error; skipping keeps
    // evaluation total instead of throwing across the package boundary.
    if (badge === undefined) continue;
    newBadges.push(badge);
    earned.add(rule.id);
  }
  return newBadges;
}
