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

// Single source of truth for user-facing numeric input bounds. The zod
// schemas below, the web app's form validation and the API's assistant
// grounding defaults all read these objects, so changing a bound here
// updates every consumer at once.
export const SURVEY_BOUNDS = {
  householdSize: { min: 1, max: 15 },
  monthlyElectricityKwh: { max: 5000 },
  monthlyBillInr: { max: 100_000 },
  lpgCylindersPerMonth: { min: 0, max: 10 },
  commuteKmOneWay: { min: 0, max: 200 },
  commuteDaysPerWeek: { min: 0, max: 7 },
  carpoolSize: { min: 1, max: 4 },
  flightsShortPerYear: { min: 0, max: 100 },
  flightsLongPerYear: { min: 0, max: 50 },
  acHoursPerDay: { min: 0, max: 24 },
} as const;

export const SURYA_GHAR_BOUNDS = {
  monthlyUnits: { min: 30, max: 2000 },
  roofAreaSqFt: { min: 80, max: 20_000 },
  tariffPerUnit: { max: 30 },
} as const;

export const KUSUM_BOUNDS = {
  pumpHp: { min: 1, max: 10 },
  landAcres: { max: 10_000 },
} as const;

export const EV_FIT_BOUNDS = {
  dailyKm: { min: 1, max: 300 },
  longTripsPerMonth: { min: 0, max: 20 },
} as const;

export const baselineSurveySchema: z.ZodType<BaselineSurveyInput> = z
  .object({
    householdSize: z
      .number()
      .int()
      .min(SURVEY_BOUNDS.householdSize.min)
      .max(SURVEY_BOUNDS.householdSize.max),
    // >5,000 kWh/month is outside residential reality — treat as junk input.
    monthlyElectricityKwh: z
      .number()
      .positive()
      .max(SURVEY_BOUNDS.monthlyElectricityKwh.max)
      .optional(),
    monthlyBillInr: z.number().positive().max(SURVEY_BOUNDS.monthlyBillInr.max).optional(),
    lpgCylindersPerMonth: z
      .number()
      .min(SURVEY_BOUNDS.lpgCylindersPerMonth.min)
      .max(SURVEY_BOUNDS.lpgCylindersPerMonth.max),
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
    commuteKmOneWay: z
      .number()
      .min(SURVEY_BOUNDS.commuteKmOneWay.min)
      .max(SURVEY_BOUNDS.commuteKmOneWay.max),
    commuteDaysPerWeek: z
      .number()
      .int()
      .min(SURVEY_BOUNDS.commuteDaysPerWeek.min)
      .max(SURVEY_BOUNDS.commuteDaysPerWeek.max),
    carpoolSize: z
      .number()
      .int()
      .min(SURVEY_BOUNDS.carpoolSize.min)
      .max(SURVEY_BOUNDS.carpoolSize.max)
      .optional(),
    flightsShortPerYear: z
      .number()
      .int()
      .min(SURVEY_BOUNDS.flightsShortPerYear.min)
      .max(SURVEY_BOUNDS.flightsShortPerYear.max),
    flightsLongPerYear: z
      .number()
      .int()
      .min(SURVEY_BOUNDS.flightsLongPerYear.min)
      .max(SURVEY_BOUNDS.flightsLongPerYear.max),
    dietPattern: z.enum(['vegan', 'vegetarian', 'eggs', 'nonveg-weekly', 'nonveg-daily']),
    shoppingLevel: z.enum(['low', 'medium', 'high']),
    acHoursPerDay: z
      .number()
      .min(SURVEY_BOUNDS.acHoursPerDay.min)
      .max(SURVEY_BOUNDS.acHoursPerDay.max),
    state: z.string().trim().min(1).max(60).optional(),
  })
  .refine((s) => s.monthlyElectricityKwh !== undefined || s.monthlyBillInr !== undefined, {
    message: 'Provide monthlyElectricityKwh or monthlyBillInr',
    path: ['monthlyElectricityKwh'],
  });

export const suryaGharInputSchema: z.ZodType<SuryaGharInput> = z.object({
  monthlyUnits: z
    .number()
    .min(SURYA_GHAR_BOUNDS.monthlyUnits.min)
    .max(SURYA_GHAR_BOUNDS.monthlyUnits.max),
  roofAreaSqFt: z
    .number()
    .min(SURYA_GHAR_BOUNDS.roofAreaSqFt.min)
    .max(SURYA_GHAR_BOUNDS.roofAreaSqFt.max)
    .optional(),
  tariffPerUnit: z.number().positive().max(SURYA_GHAR_BOUNDS.tariffPerUnit.max).optional(),
  state: z.string().trim().min(1).max(60).optional(),
});

export const kusumInputSchema: z.ZodType<KusumInput> = z.object({
  farmerType: z.enum(['individual', 'group']),
  pumpType: z.enum(['diesel', 'grid', 'none']),
  pumpHp: z.number().min(KUSUM_BOUNDS.pumpHp.min).max(KUSUM_BOUNDS.pumpHp.max),
  hasBarrenLand: z.boolean(),
  landAcres: z.number().positive().max(KUSUM_BOUNDS.landAcres.max).optional(),
  state: z.string().trim().min(1).max(60).optional(),
});

export const evFitInputSchema: z.ZodType<EvFitInput> = z.object({
  dailyKm: z.number().min(EV_FIT_BOUNDS.dailyKm.min).max(EV_FIT_BOUNDS.dailyKm.max),
  currentVehicle: z.enum(['car-petrol', 'car-diesel', 'two-wheeler', 'none']),
  hasHomeCharging: z.boolean(),
  hasOfficeCharging: z.boolean(),
  longTripsPerMonth: z
    .number()
    .int()
    .min(EV_FIT_BOUNDS.longTripsPerMonth.min)
    .max(EV_FIT_BOUNDS.longTripsPerMonth.max),
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

// One contract for every actionId crossing the boundary — catalog ids are
// short slugs, so 64 chars is generous and trim absorbs copy-paste noise.
const actionIdSchema = z.string().trim().min(1).max(64);

// Request schemas are .strict(): unknown keys are rejected outright (defense
// in depth against type-confusion payloads). Persisted-state schemas below
// stay non-strict so states written by future versions still parse.
export const actionLogRequestSchema: z.ZodType<ActionLogRequest> = z
  .object({
    userId: z.string().trim().min(1).max(100),
    actionId: actionIdSchema,
    // Transport-layer sanity bound — the catalog's per-action maxPerDay is the real cap.
    quantity: z.number().int().min(1).max(100),
  })
  .strict();

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
  actionId: actionIdSchema,
  quantity: z.number().int().min(1).max(100),
  co2SavedKg: z.number().min(0).max(10_000),
  points: z.number().int().min(0).max(100_000),
  loggedAtISO: z.string().min(4).max(40),
});

export const dailyPledgeSchema: z.ZodType<DailyPledge> = z.object({
  actionId: actionIdSchema,
  dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bonusApplied: z.boolean(),
});

// earnedBadges/pledge arrived after the first release: parsing backfills []
// and null for states persisted before these fields existed, so old
// localStorage mirrors keep restoring cleanly.
const gamificationStateBase = z.object({
  points: z.number().int().min(0).max(10_000_000),
  totalCo2SavedKg: z.number().min(0).max(1_000_000),
  streak: streakStateSchema,
  actionLog: z.array(actionLogEntrySchema).max(5000),
  earnedBadges: z.array(z.string().min(1).max(100)).optional(),
  pledge: dailyPledgeSchema.nullable().optional(),
});

// The three-parameter ZodType form models the optional-input → required-output
// transform honestly, so output drift from GamificationState stays a compile
// error (an `as` cast here would silently mask it).
export const gamificationStateSchema: z.ZodType<
  GamificationState,
  z.ZodTypeDef,
  z.input<typeof gamificationStateBase>
> = gamificationStateBase.transform((data) => ({
  ...data,
  earnedBadges: data.earnedBadges ?? [],
  pledge: data.pledge ?? null,
}));

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

// The z.ZodType<QuizAnswers> annotation pins these enums to the literal-union
// answer types in types.ts — adding a quiz option without updating both is a
// compile error.
export const quizAnswersSchema: z.ZodType<QuizAnswers> = z
  .object({
    commute: z.enum(['car', 'two-wheeler', 'metro-bus', 'cycle-walk', 'wfh']),
    ac: z.enum(['all-night', 'few-hours', 'rarely', 'no-ac']),
    diet: z.enum(['nonveg-daily', 'nonveg-weekly', 'eggs', 'veg']),
    flights: z.enum(['none', 'one-two', 'three-plus']),
    shopping: z.enum(['minimal', 'monthly', 'love-shopping']),
  })
  .strict();

export const quizEstimateRequestSchema: z.ZodType<QuizEstimateRequest> = z
  .object({
    answers: quizAnswersSchema,
  })
  .strict();

export const pledgeRequestSchema: z.ZodType<PledgeRequest> = z
  .object({
    userId: z.string().trim().min(1).max(100),
    actionId: actionIdSchema,
  })
  .strict();

// 3-param form: the embedded gamification transform accepts pre-badge states
// as input, so this schema's input type is wider than BootstrapRequest.
export const bootstrapRequestSchema: z.ZodType<BootstrapRequest, z.ZodTypeDef, unknown> = z
  .object({
    userId: z.string().trim().min(1).max(100).optional(),
    displayName: z.string().trim().min(1).max(60).optional(),
    baseline: baselineFootprintResultSchema.optional(),
    survey: baselineSurveySchema.optional(),
    gamification: gamificationStateSchema.optional(),
    source: z.enum(['quiz', 'survey']).optional(),
  })
  .strict();
