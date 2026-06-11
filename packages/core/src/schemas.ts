/**
 * Zod schemas for every payload that crosses the HTTP boundary, shared by the
 * API (validation) and the web client (type-safe requests). Schemas mirror
 * the interfaces in types.ts — the z.ZodType annotations make any drift a
 * compile error. Security: all bounds are deliberately tight so junk or
 * hostile payloads are rejected before any calculator runs.
 */
import { z } from 'zod';
import type {
  ActionLogEntry,
  ActionLogRequest,
  AssistantQueryRequest,
  BaselineFootprintResult,
  BaselineSurveyInput,
  BootstrapRequest,
  CommuteCompareRequest,
  DailyPledge,
  EvFitInput,
  GamificationState,
  KusumInput,
  PledgeRequest,
  QuizAnswers,
  QuizEstimateRequest,
  StreakState,
  SuryaGharInput,
} from './types';

export const baselineSurveySchema: z.ZodType<BaselineSurveyInput> = z
  .object({
    householdSize: z.number().int().min(1).max(15),
    // >5,000 kWh/month is outside residential reality — treat as junk input.
    monthlyElectricityKwh: z.number().positive().max(5000).optional(),
    monthlyBillInr: z.number().positive().max(100_000).optional(),
    lpgCylindersPerMonth: z.number().min(0).max(10),
    commuteMode: z.enum([
      'car-petrol',
      'car-diesel',
      'car-cng',
      'two-wheeler',
      'auto',
      'bus',
      'metro',
      'train',
      'cycle-walk',
      'wfh',
    ]),
    commuteKmOneWay: z.number().min(0).max(200),
    commuteDaysPerWeek: z.number().int().min(0).max(7),
    carpoolSize: z.number().int().min(1).max(4).optional(),
    flightsShortPerYear: z.number().int().min(0).max(100),
    flightsLongPerYear: z.number().int().min(0).max(50),
    dietPattern: z.enum(['vegan', 'vegetarian', 'eggs', 'nonveg-weekly', 'nonveg-daily']),
    shoppingLevel: z.enum(['low', 'medium', 'high']),
    acHoursPerDay: z.number().min(0).max(24),
    state: z.string().trim().min(1).max(60).optional(),
  })
  .refine((s) => s.monthlyElectricityKwh !== undefined || s.monthlyBillInr !== undefined, {
    message: 'Provide monthlyElectricityKwh or monthlyBillInr',
    path: ['monthlyElectricityKwh'],
  });

export const suryaGharInputSchema: z.ZodType<SuryaGharInput> = z.object({
  monthlyUnits: z.number().min(30).max(2000),
  roofAreaSqFt: z.number().min(80).max(20_000).optional(),
  tariffPerUnit: z.number().positive().max(30).optional(),
  state: z.string().trim().min(1).max(60).optional(),
});

export const kusumInputSchema: z.ZodType<KusumInput> = z.object({
  farmerType: z.enum(['individual', 'group']),
  pumpType: z.enum(['diesel', 'grid', 'none']),
  pumpHp: z.number().min(1).max(10),
  hasBarrenLand: z.boolean(),
  landAcres: z.number().positive().max(10_000).optional(),
  state: z.string().trim().min(1).max(60).optional(),
});

export const evFitInputSchema: z.ZodType<EvFitInput> = z.object({
  dailyKm: z.number().min(1).max(300),
  currentVehicle: z.enum(['car-petrol', 'car-diesel', 'two-wheeler', 'none']),
  hasHomeCharging: z.boolean(),
  hasOfficeCharging: z.boolean(),
  longTripsPerMonth: z.number().int().min(0).max(20),
  cityTier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export const commuteCompareRequestSchema: z.ZodType<CommuteCompareRequest> = z
  .object({
    distanceKm: z.number().positive().max(500).optional(),
    origin: z.string().trim().min(1).max(200).optional(),
    destination: z.string().trim().min(1).max(200).optional(),
  })
  .refine(
    (r) => r.distanceKm !== undefined || (r.origin !== undefined && r.destination !== undefined),
    { message: 'Provide distanceKm, or both origin and destination', path: ['distanceKm'] },
  );

export const actionLogRequestSchema: z.ZodType<ActionLogRequest> = z.object({
  userId: z.string().trim().min(1).max(100),
  actionId: z.string().trim().min(1).max(64),
  // Transport-layer sanity bound — the catalog's per-action maxPerDay is the real cap.
  quantity: z.number().int().min(1).max(100),
});

export const assistantQueryRequestSchema: z.ZodType<AssistantQueryRequest> = z.object({
  userId: z.string().trim().min(1).max(100).optional(),
  // Security: hard cap keeps the prompt-injection surface and Gemini token spend bounded.
  message: z.string().min(1).max(1000),
});

export const streakStateSchema: z.ZodType<StreakState> = z.object({
  current: z.number().int().min(0).max(10_000),
  longest: z.number().int().min(0).max(10_000),
  shields: z.number().int().min(0).max(3),
  lastLogDateISO: z.string().min(4).max(40).nullable(),
});

export const actionLogEntrySchema: z.ZodType<ActionLogEntry> = z.object({
  actionId: z.string().trim().min(1).max(64),
  quantity: z.number().int().min(1).max(100),
  co2SavedKg: z.number().min(0).max(10_000),
  points: z.number().int().min(0).max(100_000),
  loggedAtISO: z.string().min(4).max(40),
});

export const dailyPledgeSchema: z.ZodType<DailyPledge> = z.object({
  actionId: z.string().min(1).max(100),
  dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bonusApplied: z.boolean(),
});

// Note: earnedBadges and pledge were added in v0.2.0 for backward compat with v0.1.0 states.
// Parsing fills missing fields with [] and null respectively to maintain the type contract.
const gamificationStateBase = z.object({
  points: z.number().int().min(0).max(10_000_000),
  totalCo2SavedKg: z.number().min(0).max(1_000_000),
  streak: streakStateSchema,
  actionLog: z.array(actionLogEntrySchema).max(5000),
  earnedBadges: z.array(z.string().min(1).max(100)).optional(),
  pledge: dailyPledgeSchema.nullable().optional(),
});

export const gamificationStateSchema = gamificationStateBase.transform((data) => ({
  ...data,
  earnedBadges: data.earnedBadges ?? [],
  pledge: data.pledge ?? null,
})) as z.ZodType<GamificationState>;

export const baselineFootprintResultSchema: z.ZodType<BaselineFootprintResult> = z.object({
  totalKgAnnual: z.number().min(0).max(1_000_000),
  byCategory: z.object({
    homeEnergy: z.number().min(0).max(1_000_000),
    transport: z.number().min(0).max(1_000_000),
    food: z.number().min(0).max(1_000_000),
    shopping: z.number().min(0).max(1_000_000),
  }),
  vsIndiaAverage: z.number().min(0).max(1000),
  vsUrbanAffluent: z.number().min(0).max(1000),
  topDriver: z.enum(['homeEnergy', 'transport', 'food', 'shopping']),
  generatedTips: z.array(z.string().min(1).max(300)).max(5),
});

export const quizAnswersSchema: z.ZodType<QuizAnswers> = z.object({
  commute: z.enum(['car', 'two-wheeler', 'metro-bus', 'cycle-walk', 'wfh']),
  ac: z.enum(['all-night', 'few-hours', 'rarely', 'no-ac']),
  diet: z.enum(['nonveg-daily', 'nonveg-weekly', 'eggs', 'veg']),
  flights: z.enum(['none', 'one-two', 'three-plus']),
  shopping: z.enum(['minimal', 'monthly', 'love-shopping']),
});

export const quizEstimateRequestSchema: z.ZodType<QuizEstimateRequest> = z.object({
  answers: quizAnswersSchema,
});

export const pledgeRequestSchema: z.ZodType<PledgeRequest> = z.object({
  userId: z.string().trim().min(1).max(100),
  actionId: z.string().min(1).max(100),
});

export const bootstrapRequestSchema: z.ZodType<BootstrapRequest> = z.object({
  userId: z.string().trim().min(1).max(100).optional(),
  displayName: z.string().trim().min(1).max(60).optional(),
  baseline: baselineFootprintResultSchema.optional(),
  gamification: gamificationStateSchema.optional(),
  source: z.enum(['quiz', 'survey']).optional(),
});
