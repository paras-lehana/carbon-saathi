/**
 * Badge catalog contract and evaluation rules: every trigger awards exactly
 * once, boundaries are pinned, and evaluation is idempotent — re-running
 * with the returned ids appended yields nothing new.
 */
import { describe, expect, it } from 'vitest';
import { BADGE_CATALOG, evaluateBadges } from '../badges';
import type { BadgeEvaluationInput } from '../types';

/** All-false baseline: no badge qualifies; tests override single triggers. */
function noTriggers(overrides: Partial<BadgeEvaluationInput> = {}): BadgeEvaluationInput {
  return {
    earnedBadges: [],
    hasBaseline: false,
    joinedViaQuiz: false,
    actionCount: 0,
    streakCurrent: 0,
    totalCo2SavedKg: 0,
    missionCompleted: false,
    pledgeCompleted: false,
    ...overrides,
  };
}

function earnedIds(input: BadgeEvaluationInput): string[] {
  return evaluateBadges(input).map((badge) => badge.id);
}

describe('BADGE_CATALOG contract', () => {
  it('contains exactly the 8 contracted badges with unique ids', () => {
    expect(BADGE_CATALOG).toHaveLength(8);
    const ids = BADGE_CATALOG.map((badge) => badge.id);
    expect(new Set(ids).size).toBe(8);
    expect(ids).toEqual([
      'quiz-whiz',
      'pehla-kadam',
      'pehli-jeet',
      'streak-3',
      'streak-7',
      'saver-10',
      'mission-master',
      'pledge-keeper',
    ]);
  });

  it('gives every badge complete display fields', () => {
    for (const badge of BADGE_CATALOG) {
      expect(badge.name.length).toBeGreaterThan(0);
      expect(badge.description.length).toBeGreaterThan(0);
      expect(badge.icon.length).toBeGreaterThan(0);
      expect(badge.hint.length).toBeGreaterThan(0);
    }
  });
});

describe('evaluateBadges triggers', () => {
  it('awards each badge from its single trigger', () => {
    expect(earnedIds(noTriggers({ joinedViaQuiz: true }))).toEqual(['quiz-whiz']);
    expect(earnedIds(noTriggers({ hasBaseline: true }))).toEqual(['pehla-kadam']);
    expect(earnedIds(noTriggers({ actionCount: 1 }))).toEqual(['pehli-jeet']);
    expect(earnedIds(noTriggers({ missionCompleted: true }))).toEqual(['mission-master']);
    expect(earnedIds(noTriggers({ pledgeCompleted: true }))).toEqual(['pledge-keeper']);
  });

  it('pins the streak boundaries: 2 earns nothing, 3 and 7 earn the milestones', () => {
    expect(earnedIds(noTriggers({ streakCurrent: 2 }))).toEqual([]);
    expect(earnedIds(noTriggers({ streakCurrent: 3 }))).toEqual(['streak-3']);
    expect(earnedIds(noTriggers({ streakCurrent: 6 }))).toEqual(['streak-3']);
    // A fresh 7-day streak lands both milestones in one call.
    expect(earnedIds(noTriggers({ streakCurrent: 7 }))).toEqual(['streak-3', 'streak-7']);
  });

  it('pins the saver boundary at exactly 10 kg', () => {
    expect(earnedIds(noTriggers({ totalCo2SavedKg: 9.99 }))).toEqual([]);
    expect(earnedIds(noTriggers({ totalCo2SavedKg: 10 }))).toEqual(['saver-10']);
  });

  it('returns [] when nothing qualifies', () => {
    expect(earnedIds(noTriggers())).toEqual([]);
  });
});

describe('evaluateBadges idempotency', () => {
  it('never re-awards badges already earned', () => {
    const first = noTriggers({ joinedViaQuiz: true, actionCount: 5, streakCurrent: 3 });
    const firstIds = earnedIds(first);
    expect(firstIds).toEqual(['quiz-whiz', 'pehli-jeet', 'streak-3']);
    // Same triggers with the earned list applied — nothing new.
    expect(earnedIds({ ...first, earnedBadges: firstIds })).toEqual([]);
  });

  it('awards only the missing badges when partially earned', () => {
    const input = noTriggers({
      earnedBadges: ['quiz-whiz', 'streak-3'],
      joinedViaQuiz: true,
      streakCurrent: 7,
    });
    expect(earnedIds(input)).toEqual(['streak-7']);
  });
});
