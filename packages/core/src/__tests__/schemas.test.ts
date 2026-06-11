/**
 * Schema contract: every API payload schema accepts realistic valid input
 * and rejects malformed, out-of-range or oversized payloads.
 */
import { describe, expect, it } from 'vitest';
import {
  actionLogRequestSchema,
  assistantQueryRequestSchema,
  baselineSurveySchema,
  bootstrapRequestSchema,
  commuteCompareRequestSchema,
  evFitInputSchema,
  gamificationStateSchema,
  kusumInputSchema,
  pledgeRequestSchema,
  quizAnswersSchema,
  quizEstimateRequestSchema,
  suryaGharInputSchema,
} from '../schemas';

const validSurvey = {
  householdSize: 3,
  monthlyElectricityKwh: 250,
  lpgCylindersPerMonth: 1,
  commuteMode: 'metro',
  commuteKmOneWay: 12,
  commuteDaysPerWeek: 5,
  flightsShortPerYear: 2,
  flightsLongPerYear: 0,
  dietPattern: 'vegetarian',
  shoppingLevel: 'medium',
  acHoursPerDay: 4,
  state: 'Delhi',
};

describe('baselineSurveySchema', () => {
  it('accepts a realistic survey', () => {
    expect(baselineSurveySchema.safeParse(validSurvey).success).toBe(true);
  });

  it('rejects a survey with neither kWh nor bill', () => {
    const { monthlyElectricityKwh: _omitted, ...rest } = validSurvey;
    expect(baselineSurveySchema.safeParse(rest).success).toBe(false);
  });

  it('rejects out-of-range household size and unknown commute modes', () => {
    expect(baselineSurveySchema.safeParse({ ...validSurvey, householdSize: 0 }).success).toBe(
      false,
    );
    expect(baselineSurveySchema.safeParse({ ...validSurvey, commuteMode: 'rocket' }).success).toBe(
      false,
    );
  });
});

describe('scheme and EV schemas', () => {
  it('suryaGhar accepts valid input and rejects sub-30 monthly units', () => {
    expect(suryaGharInputSchema.safeParse({ monthlyUnits: 250, roofAreaSqFt: 400 }).success).toBe(
      true,
    );
    expect(suryaGharInputSchema.safeParse({ monthlyUnits: 20 }).success).toBe(false);
  });

  it('kusum accepts a diesel farmer and rejects a 12 HP pump', () => {
    expect(
      kusumInputSchema.safeParse({
        farmerType: 'individual',
        pumpType: 'diesel',
        pumpHp: 5,
        hasBarrenLand: true,
        landAcres: 3,
      }).success,
    ).toBe(true);
    expect(
      kusumInputSchema.safeParse({
        farmerType: 'individual',
        pumpType: 'diesel',
        pumpHp: 12,
        hasBarrenLand: false,
      }).success,
    ).toBe(false);
  });

  it('evFit accepts tiers 1-3 only', () => {
    const valid = {
      dailyKm: 40,
      currentVehicle: 'car-petrol',
      hasHomeCharging: true,
      hasOfficeCharging: false,
      longTripsPerMonth: 2,
      cityTier: 2,
    };
    expect(evFitInputSchema.safeParse(valid).success).toBe(true);
    expect(evFitInputSchema.safeParse({ ...valid, cityTier: 4 }).success).toBe(false);
  });
});

describe('request schemas', () => {
  it('commute compare needs distanceKm or both origin and destination', () => {
    expect(commuteCompareRequestSchema.safeParse({ distanceKm: 12 }).success).toBe(true);
    expect(
      commuteCompareRequestSchema.safeParse({ origin: 'Saket', destination: 'Cyber City' }).success,
    ).toBe(true);
    expect(commuteCompareRequestSchema.safeParse({ origin: 'Saket' }).success).toBe(false);
    expect(commuteCompareRequestSchema.safeParse({}).success).toBe(false);
  });

  it('action log rejects non-positive quantities', () => {
    expect(
      actionLogRequestSchema.safeParse({ userId: 'u1', actionId: 'veg-day', quantity: 1 }).success,
    ).toBe(true);
    expect(
      actionLogRequestSchema.safeParse({ userId: 'u1', actionId: 'veg-day', quantity: 0 }).success,
    ).toBe(false);
  });

  it('assistant message is bounded to 1..1000 chars', () => {
    expect(
      assistantQueryRequestSchema.safeParse({ message: 'How big is my footprint?' }).success,
    ).toBe(true);
    expect(assistantQueryRequestSchema.safeParse({ message: '' }).success).toBe(false);
    expect(assistantQueryRequestSchema.safeParse({ message: 'x'.repeat(1001) }).success).toBe(
      false,
    );
  });

  it('bootstrap accepts an empty body (fresh anonymous user)', () => {
    expect(bootstrapRequestSchema.safeParse({}).success).toBe(true);
  });

  it('bootstrap validates a full restore payload', () => {
    const restore = {
      userId: 'u1',
      displayName: 'Asha',
      gamification: {
        points: 120,
        totalCo2SavedKg: 12,
        streak: { current: 3, longest: 5, shields: 1, lastLogDateISO: '2026-06-05' },
        actionLog: [
          {
            actionId: 'veg-day',
            quantity: 1,
            co2SavedKg: 0.8,
            points: 8,
            loggedAtISO: '2026-06-05',
          },
        ],
      },
    };
    expect(bootstrapRequestSchema.safeParse(restore).success).toBe(true);
    expect(
      bootstrapRequestSchema.safeParse({
        ...restore,
        gamification: { ...restore.gamification, points: -5 },
      }).success,
    ).toBe(false);
  });

  it('bootstrap rejects unknown keys outright (.strict defense-in-depth)', () => {
    expect(bootstrapRequestSchema.safeParse({ isAdmin: true }).success).toBe(false);
    expect(bootstrapRequestSchema.safeParse({ displayName: 'Asha', role: 'root' }).success).toBe(
      false,
    );
  });
});

describe('gamification state back-compat', () => {
  it('backfills earnedBadges [] and pledge null on pre-badge states', () => {
    // A state persisted before the badge/pledge fields existed must still
    // parse — old localStorage mirrors depend on it.
    const legacy = {
      points: 80,
      totalCo2SavedKg: 8,
      streak: { current: 2, longest: 4, shields: 0, lastLogDateISO: '2026-06-01' },
      actionLog: [],
    };
    const parsed = gamificationStateSchema.safeParse(legacy);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.earnedBadges).toEqual([]);
      expect(parsed.data.pledge).toBeNull();
    }
  });

  it('passes through populated badge and pledge fields unchanged', () => {
    const modern = {
      points: 80,
      totalCo2SavedKg: 8,
      streak: { current: 2, longest: 4, shields: 0, lastLogDateISO: '2026-06-01' },
      actionLog: [],
      earnedBadges: ['quiz-whiz'],
      pledge: { actionId: 'veg-day', dateISO: '2026-06-11', bonusApplied: false },
    };
    const parsed = gamificationStateSchema.safeParse(modern);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.earnedBadges).toEqual(['quiz-whiz']);
      expect(parsed.data.pledge?.actionId).toBe('veg-day');
    }
  });
});

describe('quiz and pledge schemas', () => {
  const validAnswers = {
    commute: 'metro-bus',
    ac: 'rarely',
    diet: 'veg',
    flights: 'none',
    shopping: 'minimal',
  };

  it('accepts a full valid answer set and rejects unknown option ids', () => {
    expect(quizAnswersSchema.safeParse(validAnswers).success).toBe(true);
    expect(quizAnswersSchema.safeParse({ ...validAnswers, commute: 'rocket' }).success).toBe(false);
    expect(quizEstimateRequestSchema.safeParse({ answers: validAnswers }).success).toBe(true);
  });

  it('rejects missing answers and junk keys', () => {
    const { shopping: _omitted, ...partial } = validAnswers;
    expect(quizAnswersSchema.safeParse(partial).success).toBe(false);
    expect(quizAnswersSchema.safeParse({ ...validAnswers, extra: 'x' }).success).toBe(false);
  });

  it('pledge requests share the actionId bounds (trim, max 64)', () => {
    expect(pledgeRequestSchema.safeParse({ userId: 'u1', actionId: 'veg-day' }).success).toBe(true);
    expect(pledgeRequestSchema.safeParse({ userId: 'u1', actionId: 'x'.repeat(65) }).success).toBe(
      false,
    );
    expect(pledgeRequestSchema.safeParse({ userId: 'u1' }).success).toBe(false);
  });
});
