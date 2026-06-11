/**
 * Gamification engine: points, levels, streaks (with shields), weekly
 * missions and impact analogies. Pure and clock-free — callers pass every
 * date in as an ISO string, so replays and tests are fully deterministic.
 */
import { EMISSION_FACTORS } from './emission-factors';
import { appError, type AppError } from './errors';
import { err, ok, type Result } from './result';
import type {
  ActionLogEntry,
  ImpactAnalogies,
  LevelDefinition,
  LevelProgress,
  Mission,
  MissionProgress,
  StreakState,
} from './types';

const POINTS_PER_KG_CO2 = 10; // contract: 10 points per kg CO2e keeps points integral and legible
// Product tuning value: a visible reward for keeping a self-set commitment
// (the commitment-device effect) — 20% is large enough to notice, small
// enough not to distort the points-per-kg contract.
const PLEDGE_BONUS_MULTIPLIER = 1.2;

export function pointsForCo2(kgCo2Saved: number): number {
  return Math.max(0, Math.round(kgCo2Saved * POINTS_PER_KG_CO2));
}

/**
 * 1.2× bonus for completing today's pledged action, rounded to keep points
 * integral. Applied by the API's action-log route exactly once per pledge
 * (it flips pledge.bonusApplied after).
 */
export function applyPledgeBonus(points: number): number {
  return Math.round(points * PLEDGE_BONUS_MULTIPLIER);
}

// Thresholds tuned so a consistent daily logger reaches Sapling in ~2 weeks
// and Forest in roughly a year of habit-building.
export const LEVELS: readonly LevelDefinition[] = [
  { name: 'Seed', icon: '🌱', minPoints: 0 },
  { name: 'Sapling', icon: '🌿', minPoints: 500 },
  { name: 'Tree', icon: '🌳', minPoints: 2_000 },
  { name: 'Grove', icon: '🏞️', minPoints: 5_000 },
  { name: 'Forest', icon: '🌲', minPoints: 12_000 },
];

export function levelForPoints(points: number): LevelProgress {
  const safePoints = Math.max(0, points);
  let index = 0;
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (safePoints >= LEVELS[i].minPoints) index = i;
  }
  const level = LEVELS[index];
  const next = index + 1 < LEVELS.length ? LEVELS[index + 1] : null;
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

// ── Streaks ───────────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;
const MAX_SHIELDS = 3; // cap keeps shields a safety net, not a stockpile
const SHIELD_EARN_INTERVAL_DAYS = 7;

function toUtcDayNumber(iso: string): number {
  // Date.parse treats bare 'YYYY-MM-DD' as UTC midnight, which keeps the
  // day arithmetic timezone-independent.
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? Number.NaN : Math.floor(ms / MS_PER_DAY);
}

function dayNumberToIsoDate(day: number): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

export function updateStreak(
  state: StreakState,
  logDateISO: string,
): Result<StreakState, AppError> {
  const logDay = toUtcDayNumber(logDateISO);
  if (Number.isNaN(logDay)) {
    return err(appError('VALIDATION_FAILED', 'logDateISO must be a parseable ISO date'));
  }
  if (state.lastLogDateISO === null) {
    return ok({
      current: 1,
      longest: Math.max(state.longest, 1),
      shields: state.shields,
      lastLogDateISO: dayNumberToIsoDate(logDay),
    });
  }
  const lastDay = toUtcDayNumber(state.lastLogDateISO);
  if (Number.isNaN(lastDay)) {
    return err(appError('VALIDATION_FAILED', 'state.lastLogDateISO is not a parseable ISO date'));
  }
  const gapDays = logDay - lastDay;
  // Same-day and out-of-order logs are idempotent — duplicate action logs
  // must never double-count a streak day.
  if (gapDays <= 0) return ok(state);

  let current = state.current;
  let shields = state.shields;
  if (gapDays === 1) {
    current += 1;
  } else if (gapDays === 2 && shields > 0) {
    // A shield absorbs exactly one missed day; longer gaps reset honestly.
    shields -= 1;
    current += 1;
  } else {
    current = 1;
  }
  if (current % SHIELD_EARN_INTERVAL_DAYS === 0) {
    shields = Math.min(MAX_SHIELDS, shields + 1);
  }
  return ok({
    current,
    longest: Math.max(state.longest, current),
    shields,
    lastLogDateISO: dayNumberToIsoDate(logDay),
  });
}

// ── Weekly missions ───────────────────────────────────────────────────────────

export const WEEKLY_MISSIONS: readonly Mission[] = [
  {
    id: 'car-free-commute-x3',
    title: 'Car-free commute ×3',
    description:
      'Take the metro, the bus, cycle/walk, or work from home for three commutes this week.',
    metric: 'log-count',
    target: 3,
    countedActionIds: [
      'metro-instead-of-car',
      'bus-instead-of-car',
      'cycle-or-walk-short',
      'wfh-day',
    ],
  },
  {
    id: 'veg-days-x3',
    title: 'Veg days ×3',
    description: 'Log three fully vegetarian days this week.',
    metric: 'log-count',
    target: 3,
    countedActionIds: ['veg-day'],
  },
  {
    id: 'save-5kg-co2',
    title: 'Save 5 kg CO2 this week',
    description: 'Any mix of actions adding up to 5 kg CO2e saved.',
    metric: 'co2-kg',
    target: 5,
  },
];

export function evaluateMissions(
  actionLog: readonly ActionLogEntry[],
  weekStartISO: string,
): Result<MissionProgress[], AppError> {
  const weekStartDay = toUtcDayNumber(weekStartISO);
  if (Number.isNaN(weekStartDay)) {
    return err(appError('VALIDATION_FAILED', 'weekStartISO must be a parseable ISO date'));
  }
  // Half-open [start, start+7) window; entries with unparseable dates are
  // skipped rather than failing the whole evaluation.
  const inWeek = actionLog.filter((entry) => {
    const day = toUtcDayNumber(entry.loggedAtISO);
    return !Number.isNaN(day) && day >= weekStartDay && day < weekStartDay + 7;
  });
  return ok(
    WEEKLY_MISSIONS.map((mission) => {
      const value =
        mission.metric === 'co2-kg'
          ? inWeek.reduce((sum, entry) => sum + entry.co2SavedKg, 0)
          : inWeek
              .filter((entry) => mission.countedActionIds?.includes(entry.actionId) ?? false)
              .reduce((sum, entry) => sum + entry.quantity, 0);
      return {
        missionId: mission.id,
        title: mission.title,
        target: mission.target,
        progress: Math.round(value * 10) / 10,
        progressPct: Math.min(100, Math.floor((value / mission.target) * 100)),
        completed: value >= mission.target,
      };
    }),
  );
}

// ── Impact analogies ──────────────────────────────────────────────────────────

const KG_PER_PHONE_CHARGE = 0.0086; // 0.012 kWh per full smartphone charge × 0.716 grid factor

export function impactAnalogies(totalKgSaved: number): ImpactAnalogies {
  const safeKg = Math.max(0, totalKgSaved);
  return {
    treesEquivalent: Math.round((safeKg / EMISSION_FACTORS.treeAbsorptionPerYear.value) * 10) / 10,
    kmNotDriven: Math.round(safeKg / EMISSION_FACTORS.carPetrol.value),
    phoneCharges: Math.round(safeKg / KG_PER_PHONE_CHARGE),
  };
}
