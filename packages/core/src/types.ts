/**
 * All domain interfaces for Carbon Saathi. This module owns the shapes only;
 * the math lives in the calculator modules and runtime validation lives in
 * schemas.ts. Keeping types dependency-free lets web/api import them freely.
 */

// ── Baseline survey ───────────────────────────────────────────────────────────

export type CommuteMode =
  | 'car-petrol'
  | 'car-diesel'
  | 'car-cng'
  | 'two-wheeler'
  | 'auto'
  | 'bus'
  | 'metro'
  | 'train'
  | 'cycle-walk'
  | 'wfh';

export type DietPattern = 'vegan' | 'vegetarian' | 'eggs' | 'nonveg-weekly' | 'nonveg-daily';

export type ShoppingLevel = 'low' | 'medium' | 'high';

export interface BaselineSurveyInput {
  householdSize: number;
  /** Either metered kWh or a rupee bill must be present (bill is converted at ₹7/unit). */
  monthlyElectricityKwh?: number;
  monthlyBillInr?: number;
  lpgCylindersPerMonth: number;
  commuteMode: CommuteMode;
  commuteKmOneWay: number;
  commuteDaysPerWeek: number;
  /** Only divides emissions for car modes; defaults to 1 (solo). */
  carpoolSize?: number;
  flightsShortPerYear: number;
  flightsLongPerYear: number;
  dietPattern: DietPattern;
  shoppingLevel: ShoppingLevel;
  /** Drives tip selection only — AC consumption is already inside metered kWh. */
  acHoursPerDay: number;
  state?: string;
}

export interface FootprintByCategory {
  homeEnergy: number;
  transport: number;
  food: number;
  shopping: number;
}

export type FootprintCategory = keyof FootprintByCategory;

export interface BaselineFootprintResult {
  totalKgAnnual: number;
  byCategory: FootprintByCategory;
  /** Ratio vs the ~2,000 kg national per-capita figure (1.0 = average Indian). */
  vsIndiaAverage: number;
  vsUrbanAffluent: number;
  topDriver: FootprintCategory;
  generatedTips: string[];
}

// ── Action catalog ────────────────────────────────────────────────────────────

export type ActionCategory = 'transport' | 'energy' | 'food' | 'lifestyle';

export interface ActionDefinition {
  id: string;
  label: string;
  category: ActionCategory;
  description: string;
  /** kg CO2e saved per logged unit — derivation commented at each catalog entry. */
  co2SavedKg: number;
  unitLabel: string;
  /** Contract: round(co2SavedKg × 10) — enforced by construction in actions.ts. */
  pointsPerUnit: number;
  maxPerDay: number;
}

export interface ActionImpact {
  co2SavedKg: number;
  points: number;
}

// ── PM Surya Ghar ─────────────────────────────────────────────────────────────

export interface SuryaGharInput {
  monthlyUnits: number;
  roofAreaSqFt?: number;
  tariffPerUnit?: number;
  state?: string;
}

export interface SuryaGharResult {
  recommendedKw: number;
  subsidyInr: number;
  capexInr: number;
  netCostInr: number;
  annualGenerationKwh: number;
  annualSavingInr: number;
  paybackYears: number;
  co2AvoidedKgPerYear: number;
  freeUnitsNote: string;
  checklist: string[];
  portalUrl: string;
  loanNote: string;
}

// ── PM KUSUM ──────────────────────────────────────────────────────────────────

export type KusumComponent = 'A' | 'B' | 'C';

export interface KusumInput {
  farmerType: 'individual' | 'group';
  pumpType: 'diesel' | 'grid' | 'none';
  pumpHp: number;
  hasBarrenLand: boolean;
  landAcres?: number;
  state?: string;
}

export interface KusumSubsidyBreakdown {
  centralPct: number;
  statePct: number;
  farmerPct: number;
  centralInr: number;
  stateInr: number;
  farmerInr: number;
  /** ~10% cash needed upfront — the rest of the farmer share is bankable. */
  farmerUpfrontApproxInr: number;
}

export interface KusumComponentASuggestion {
  component: 'A';
  landAcres: number;
  estLeaseIncomeInrPerYear: number;
  note: string;
}

export interface KusumResult {
  component: KusumComponent;
  subsidyBreakdown: KusumSubsidyBreakdown;
  estCostInr: number;
  farmerShareInr: number;
  dieselSavedLitresPerYear: number;
  co2AvoidedKgPerYear: number;
  checklist: string[];
  officialLink: string;
  componentASuggestion?: KusumComponentASuggestion;
}

// ── EV fit ────────────────────────────────────────────────────────────────────

export type EvCurrentVehicle = 'car-petrol' | 'car-diesel' | 'two-wheeler' | 'none';

export type EvRecommendation =
  | 'public-transport-first'
  | 'ev-two-wheeler'
  | 'ev-car'
  | 'hybrid'
  | 'ev-car-with-planning';

export interface EvFitInput {
  dailyKm: number;
  currentVehicle: EvCurrentVehicle;
  hasHomeCharging: boolean;
  hasOfficeCharging: boolean;
  longTripsPerMonth: number;
  cityTier: 1 | 2 | 3;
}

export interface EvFitResult {
  recommendation: EvRecommendation;
  annualCo2SavedKg: number;
  annualFuelSavingInr: number;
  fameNote: string;
  confidence: 'high' | 'medium';
}

// ── Commute comparison ────────────────────────────────────────────────────────

export type CommuteCompareMode =
  | 'car-petrol'
  | 'car-cng'
  | 'two-wheeler'
  | 'ev-2w'
  | 'bus'
  | 'metro'
  | 'cycle-walk';

export interface CommuteModeEstimate {
  mode: CommuteCompareMode;
  /** Daily round-trip kg CO2e for the given one-way distance. */
  co2Kg: number;
  costInr: number;
  annualKgIfDaily: number;
}

// ── Gamification ──────────────────────────────────────────────────────────────

export interface LevelDefinition {
  name: string;
  icon: string;
  minPoints: number;
}

export interface LevelProgress {
  name: string;
  icon: string;
  minPoints: number;
  /** null at the top level (Forest). */
  nextLevelAt: number | null;
  progressPct: number;
}

export interface StreakState {
  current: number;
  longest: number;
  /** Earned every 7-day streak (max 3); one shield absorbs one missed day. */
  shields: number;
  lastLogDateISO: string | null;
}

export type MissionMetric = 'log-count' | 'co2-kg';

export interface Mission {
  id: string;
  title: string;
  description: string;
  metric: MissionMetric;
  target: number;
  /** Required for log-count missions: which action ids count toward the target. */
  countedActionIds?: string[];
}

export interface MissionProgress {
  missionId: string;
  title: string;
  target: number;
  progress: number;
  progressPct: number;
  completed: boolean;
}

export interface ActionLogEntry {
  actionId: string;
  quantity: number;
  co2SavedKg: number;
  points: number;
  loggedAtISO: string;
}

export interface ImpactAnalogies {
  treesEquivalent: number;
  kmNotDriven: number;
  phoneCharges: number;
}

// ── Quiz (30-second onboarding) ───────────────────────────────────────────────

export type QuizQuestionId = 'commute' | 'ac' | 'diet' | 'flights' | 'shopping';

// Literal unions per question: an invalid option id is a compile error, so
// quizToSurvey needs no runtime fallbacks (schemas.ts enforces the same set
// at the HTTP edge via z.enum).
export type QuizCommuteAnswer = 'car' | 'two-wheeler' | 'metro-bus' | 'cycle-walk' | 'wfh';
export type QuizAcAnswer = 'all-night' | 'few-hours' | 'rarely' | 'no-ac';
export type QuizDietAnswer = 'nonveg-daily' | 'nonveg-weekly' | 'eggs' | 'veg';
export type QuizFlightsAnswer = 'none' | 'one-two' | 'three-plus';
export type QuizShoppingAnswer = 'minimal' | 'monthly' | 'love-shopping';

export interface QuizOption {
  id: string;
  label: string;
  emoji: string;
  blurb: string;
}

export interface QuizQuestion {
  id: QuizQuestionId;
  prompt: string;
  options: QuizOption[];
}

export interface QuizAnswers {
  commute: QuizCommuteAnswer;
  ac: QuizAcAnswer;
  diet: QuizDietAnswer;
  flights: QuizFlightsAnswer;
  shopping: QuizShoppingAnswer;
}

// ── Badges ────────────────────────────────────────────────────────────────────

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  hint: string;
}

/** Everything evaluateBadges needs to decide awards — assembled by the API from server-side state. */
export interface BadgeEvaluationInput {
  /** Badge ids already on the user; evaluation never re-awards these. */
  readonly earnedBadges: readonly string[];
  readonly hasBaseline: boolean;
  readonly joinedViaQuiz: boolean;
  readonly actionCount: number;
  readonly streakCurrent: number;
  readonly totalCo2SavedKg: number;
  readonly missionCompleted: boolean;
  readonly pledgeCompleted: boolean;
}

// ── Daily pledge ──────────────────────────────────────────────────────────────

export interface DailyPledge {
  actionId: string;
  dateISO: string;
  bonusApplied: boolean;
}

export interface GamificationState {
  points: number;
  totalCo2SavedKg: number;
  streak: StreakState;
  actionLog: ActionLogEntry[];
  /** Earned badge ids only — definitions live in the badge catalog. */
  earnedBadges: string[];
  pledge: DailyPledge | null;
}

// ── Initiatives (Mission LiFE catalog) ────────────────────────────────────────

export type InitiativeCategory =
  | 'home-energy'
  | 'mobility'
  | 'food'
  | 'waste'
  | 'water'
  | 'finance'
  | 'community';

export interface Initiative {
  id: string;
  category: InitiativeCategory;
  title: string;
  subtitle: string;
  /** Concrete individual benefit in plain language, with the source named inline. */
  benefit: string;
  /** Approximate annual kg CO2e avoided at the stated scale. */
  co2AvoidedKgAnnual?: number;
  /** Approximate annual ₹ saved at the stated scale. */
  rupeesSavedAnnual?: number;
  /**
   * Whether the numbers describe one household or a community installation —
   * community figures are 10-150× household ones and must never be summed
   * or ranked against household entries without this flag.
   */
  scale: 'household' | 'community';
  howToStart: string;
  /** Official portal or best reference URL. */
  portalUrl?: string;
  /** Scheme or programme name if applicable. */
  scheme?: string;
}

/** Full server-side user record — also the bootstrap response shape. */
export interface UserState {
  userId: string;
  displayName: string;
  createdAtISO: string;
  baseline?: BaselineFootprintResult;
  survey?: BaselineSurveyInput;
  gamification: GamificationState;
  joinedVia?: 'quiz' | 'survey';
}

// ── API request payloads (validated by schemas.ts) ───────────────────────────

export interface ActionLogRequest {
  userId: string;
  actionId: string;
  quantity: number;
}

export interface AssistantQueryRequest {
  userId?: string;
  message: string;
}

export interface CommuteCompareRequest {
  distanceKm?: number;
  origin?: string;
  destination?: string;
}

export interface BootstrapRequest {
  userId?: string;
  displayName?: string;
  baseline?: BaselineFootprintResult;
  /** Raw survey answers behind the baseline — persisted so the assistant can ground on them. */
  survey?: BaselineSurveyInput;
  gamification?: GamificationState;
  /** How this user arrived — drives the quiz-whiz badge and joinedVia. */
  source?: 'quiz' | 'survey';
}

export interface QuizEstimateRequest {
  answers: QuizAnswers;
}

export interface PledgeRequest {
  userId: string;
  actionId: string;
}
