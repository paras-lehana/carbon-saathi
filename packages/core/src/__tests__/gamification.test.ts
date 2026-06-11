/**
 * Gamification engine: level thresholds, streaks with shield earn/consume,
 * weekly mission evaluation and impact analogies. All dates are fixed ISO
 * strings — no clock access anywhere.
 */
import { describe, expect, it } from 'vitest';
import type { AppError } from '../errors';
import {
  LEVELS,
  WEEKLY_MISSIONS,
  applyPledgeBonus,
  evaluateMissions,
  impactAnalogies,
  levelForPoints,
  pointsForCo2,
  updateStreak,
} from '../gamification';
import type { Result } from '../result';
import type { ActionLogEntry, StreakState } from '../types';

function unwrap<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`);
  return result.value;
}

/** Fixed-date helper: start date + offset days, as YYYY-MM-DD (UTC). */
function isoDay(startISO: string, offsetDays: number): string {
  return new Date(Date.parse(startISO) + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

describe('pointsForCo2 and levels', () => {
  it('awards 10 points per kg, rounded', () => {
    expect(pointsForCo2(1.55)).toBe(16);
    expect(pointsForCo2(0.04)).toBe(0);
    expect(pointsForCo2(-3)).toBe(0); // negative savings never deduct points
  });

  it('applies the 1.2× pledge bonus with integer rounding', () => {
    expect(applyPledgeBonus(32)).toBe(38); // 32 × 1.2 = 38.4 → 38
    expect(applyPledgeBonus(10)).toBe(12); // 10 × 1.2 = 12
    expect(applyPledgeBonus(8)).toBe(10); // 8 × 1.2 = 9.6 → 10
    expect(applyPledgeBonus(0)).toBe(0);
  });

  it('defines the five contracted levels', () => {
    expect(LEVELS.map((l) => [l.name, l.minPoints])).toEqual([
      ['Seed', 0],
      ['Sapling', 500],
      ['Tree', 2000],
      ['Grove', 5000],
      ['Forest', 12000],
    ]);
  });

  it('resolves levels at and around the thresholds', () => {
    expect(levelForPoints(0).name).toBe('Seed');
    expect(levelForPoints(0).nextLevelAt).toBe(500);
    expect(levelForPoints(0).progressPct).toBe(0);
    expect(levelForPoints(499).name).toBe('Seed');
    expect(levelForPoints(499).progressPct).toBe(99); // floored — never 100% early
    expect(levelForPoints(500).name).toBe('Sapling');
    expect(levelForPoints(1250).progressPct).toBe(50); // (1250−500)/(2000−500)
    expect(levelForPoints(2000).name).toBe('Tree');
    expect(levelForPoints(5000).name).toBe('Grove');
  });

  it('caps at Forest with no next level', () => {
    const top = levelForPoints(15_000);
    expect(top.name).toBe('Forest');
    expect(top.nextLevelAt).toBeNull();
    expect(top.progressPct).toBe(100);
  });
});

describe('updateStreak', () => {
  const fresh: StreakState = { current: 0, longest: 0, shields: 0, lastLogDateISO: null };

  it('starts at 1, grows daily, and earns a shield at day 7', () => {
    let state = fresh;
    for (let day = 0; day < 7; day += 1) {
      state = unwrap(updateStreak(state, isoDay('2026-06-01', day)));
    }
    expect(state.current).toBe(7);
    expect(state.longest).toBe(7);
    expect(state.shields).toBe(1);
    expect(state.lastLogDateISO).toBe('2026-06-07');
  });

  it('is idempotent for same-day and out-of-order logs', () => {
    const state: StreakState = { current: 4, longest: 6, shields: 1, lastLogDateISO: '2026-06-10' };
    expect(unwrap(updateStreak(state, '2026-06-10'))).toEqual(state);
    expect(unwrap(updateStreak(state, '2026-06-08'))).toEqual(state);
  });

  it('consumes a shield to bridge exactly one missed day', () => {
    const state: StreakState = { current: 7, longest: 7, shields: 1, lastLogDateISO: '2026-06-07' };
    const next = unwrap(updateStreak(state, '2026-06-09')); // 2026-06-08 was missed
    expect(next.current).toBe(8);
    expect(next.shields).toBe(0);
    expect(next.longest).toBe(8);
  });

  it('resets after a multi-day gap even with shields in hand', () => {
    const state: StreakState = { current: 8, longest: 8, shields: 1, lastLogDateISO: '2026-06-09' };
    const next = unwrap(updateStreak(state, '2026-06-13')); // 3 missed days
    expect(next.current).toBe(1);
    expect(next.shields).toBe(1); // shield not wasted on an unbridgeable gap
    expect(next.longest).toBe(8);
  });

  it('caps shields at 3 over a 28-day streak', () => {
    let state = fresh;
    for (let day = 0; day < 28; day += 1) {
      state = unwrap(updateStreak(state, isoDay('2026-05-01', day)));
    }
    expect(state.current).toBe(28);
    expect(state.shields).toBe(3); // 7/14/21 earned, 28 capped
  });

  it('rejects unparseable dates', () => {
    const result = updateStreak(fresh, 'not-a-date');
    expect(!result.ok && result.error.code).toBe('VALIDATION_FAILED');
  });
});

describe('evaluateMissions', () => {
  const entry = (actionId: string, co2SavedKg: number, loggedAtISO: string): ActionLogEntry => ({
    actionId,
    quantity: 1,
    co2SavedKg,
    points: Math.round(co2SavedKg * 10),
    loggedAtISO,
  });
  const log: ActionLogEntry[] = [
    entry('metro-instead-of-car', 1.55, '2026-06-01'),
    entry('bus-instead-of-car', 1.2, '2026-06-02'),
    entry('wfh-day', 3.4, '2026-06-03'),
    entry('veg-day', 0.8, '2026-06-04'),
    entry('veg-day', 0.8, '2026-06-05'),
    entry('metro-instead-of-car', 1.55, '2026-05-31'), // before the week — excluded
    entry('veg-day', 0.8, '2026-06-08'), // after the half-open window — excluded
  ];

  it('ships exactly 3 active weekly missions', () => {
    expect(WEEKLY_MISSIONS).toHaveLength(3);
  });

  it('counts only in-week logs toward each mission', () => {
    const progress = unwrap(evaluateMissions(log, '2026-06-01'));
    const carFree = progress.find((p) => p.missionId === 'car-free-commute-x3');
    expect(carFree?.progress).toBe(3); // metro + bus + wfh
    expect(carFree?.completed).toBe(true);
    expect(carFree?.progressPct).toBe(100);

    const veg = progress.find((p) => p.missionId === 'veg-days-x3');
    expect(veg?.progress).toBe(2); // the 06-08 veg day falls outside the week
    expect(veg?.completed).toBe(false);
    expect(veg?.progressPct).toBe(66);

    const co2 = progress.find((p) => p.missionId === 'save-5kg-co2');
    expect(co2?.progress).toBe(7.8); // 1.55 + 1.2 + 3.4 + 0.8 + 0.8 = 7.75 → 7.8
    expect(co2?.completed).toBe(true);
  });

  it('rejects an unparseable week start', () => {
    const result = evaluateMissions(log, 'garbage');
    expect(!result.ok && result.error.code).toBe('VALIDATION_FAILED');
  });
});

describe('impactAnalogies', () => {
  it('converts 105 kg saved into trees, km and phone charges', () => {
    const analogies = impactAnalogies(105);
    expect(analogies.treesEquivalent).toBe(5); // 105 / 21
    expect(analogies.kmNotDriven).toBe(618); // 105 / 0.17 = 617.6
    expect(analogies.phoneCharges).toBe(12_209); // 105 / 0.0086
  });

  it('clamps negative totals to zero', () => {
    expect(impactAnalogies(-10)).toEqual({ treesEquivalent: 0, kmNotDriven: 0, phoneCharges: 0 });
  });
});
