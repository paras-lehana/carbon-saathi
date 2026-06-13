/**
 * Typed client for every Carbon Saathi API endpoint (SPEC §4). Owns transport
 * concerns — timeouts, JSON envelopes, error normalisation. Never throws:
 * every call resolves to ApiResult so pages handle one shape everywhere.
 * All 2xx payloads are runtime-validated via zod schemas; a malformed body
 * is normalised to UPSTREAM_FAILURE rather than reaching the UI as corrupt data.
 */
import {
  ALL_ERROR_CODES,
  actionLogEntrySchema,
  baselineFootprintResultSchema,
  baselineSurveySchema,
  dailyPledgeSchema,
  gamificationStateSchema,
  streakStateSchema,
} from '@carbon-saathi/core';
import { z } from 'zod';
import type {
  ActionDefinition,
  ActionImpact,
  ActionLogEntry,
  ActionLogRequest,
  AssistantQueryRequest,
  BadgeDefinition,
  BaselineFootprintResult,
  BaselineSurveyInput,
  BootstrapRequest,
  CommuteCompareRequest,
  CommuteModeEstimate,
  DailyPledge,
  ErrorCode,
  EvFitInput,
  EvFitResult,
  GamificationState,
  GoogleServiceIntegration,
  GoogleServiceSummary,
  ImpactAnalogies,
  KusumInput,
  KusumResult,
  LevelProgress,
  MissionProgress,
  PledgeRequest,
  QuizAnswers,
  SuryaGharInput,
  SuryaGharResult,
  UserState,
} from '@carbon-saathi/core';

// ── Result envelope ───────────────────────────────────────────────────────────

export interface ApiErrorShape {
  code: ErrorCode;
  message: string;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiErrorShape };

// ── Response payloads not modelled in core (web-only shapes) ─────────────────

export interface HealthResponse {
  status: 'ok';
  version: string;
  uptimeSec: number;
  demoMode: boolean;
}

export interface GoogleServicesResponse {
  services: GoogleServiceIntegration[];
  summary: GoogleServiceSummary;
}

export interface ActionCatalogResponse {
  actions: ActionDefinition[];
}

export interface BaselineResponse {
  baseline: BaselineFootprintResult;
}

/**
 * Server-side gamification summary as the API serialises it (SPEC §4): the
 * API trims the potentially long actionLog and pre-computes the level; both
 * the log and dashboard responses use this shape. Modelled here because the
 * web app depends only on core, never on the API package's helpers.
 */
export interface GamificationSummary {
  points: GamificationState['points'];
  totalCo2SavedKg: GamificationState['totalCo2SavedKg'];
  streak: GamificationState['streak'];
  earnedBadges: GamificationState['earnedBadges'];
  pledge: GamificationState['pledge'];
  level: LevelProgress;
}

export interface ActionLogResponse {
  impact: ActionImpact;
  gamification: GamificationSummary;
  todayLog: ActionLogEntry[];
  /** Badges earned by THIS log — full definitions so the UI can toast them. */
  newBadges: BadgeDefinition[];
}

/** Quiz estimate payload: the footprint plus the survey it was derived from. */
export interface QuizEstimateResponse {
  baseline: BaselineFootprintResult;
  survey: BaselineSurveyInput;
}

export interface DashboardResponse {
  baseline: BaselineFootprintResult | null;
  gamification: GamificationSummary;
  missions: MissionProgress[];
  recentActions: ActionLogEntry[];
  suggestions: ActionDefinition[];
  analogies: ImpactAnalogies;
}

export interface CommuteCompareResponse {
  modes: CommuteModeEstimate[];
  source: 'maps' | 'estimate';
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  level: string;
  isYou?: boolean;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  userRank: number | null;
}

export interface AssistantResponse {
  reply: string;
  mode: 'gemini' | 'demo';
  grounding: { usedBaseline: boolean; usedSchemes: boolean };
}

// ── Response validation ───────────────────────────────────────────────────────

/**
 * The minimal validating surface a 2xx body check needs — the slice of
 * z.ZodType the transport actually calls. Typing the parameter structurally
 * keeps it open to both plain and .transform() core schemas without coupling
 * the signature to zod's input/output variance.
 */
interface ResponseSchema<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false; error: unknown };
}

// Core envelope schemas (responses whose shapes are fully modelled in core).
const baselineResponseSchema = z.object({ baseline: baselineFootprintResultSchema });
const quizEstimateResponseSchema = z.object({
  baseline: baselineFootprintResultSchema,
  survey: baselineSurveySchema,
});
const pledgeResponseSchema = z.object({ pledge: dailyPledgeSchema });

// ── Web-layer response schemas ────────────────────────────────────────────────
// Shapes the API returns that core does not yet model. Composed from core
// schemas where possible; web-only fields are defined here once with no
// duplication of core field rules.

const levelProgressSchema = z.object({
  name: z.string(),
  icon: z.string(),
  minPoints: z.number(),
  nextLevelAt: z.number().nullable(),
  progressPct: z.number(),
});

// The API trims actionLog and prepends the computed level — this shape differs
// from core's GamificationState, so it cannot reuse gamificationStateSchema.
const gamificationSummarySchema = z.object({
  points: z.number(),
  totalCo2SavedKg: z.number(),
  streak: streakStateSchema,
  earnedBadges: z.array(z.string()),
  pledge: dailyPledgeSchema.nullable(),
  level: levelProgressSchema,
});

const actionDefinitionSchema = z.object({
  id: z.string(),
  label: z.string(),
  category: z.union([
    z.literal('transport'),
    z.literal('energy'),
    z.literal('food'),
    z.literal('lifestyle'),
  ]),
  description: z.string(),
  co2SavedKg: z.number(),
  unitLabel: z.string(),
  pointsPerUnit: z.number(),
  maxPerDay: z.number(),
});

const actionCatalogResponseSchema = z.object({ actions: z.array(actionDefinitionSchema) });

const actionLogResponseSchema = z.object({
  impact: z.object({ co2SavedKg: z.number(), points: z.number() }),
  gamification: gamificationSummarySchema,
  todayLog: z.array(actionLogEntrySchema),
  newBadges: z.array(
    z.object({ id: z.string(), name: z.string(), description: z.string(), icon: z.string(), hint: z.string() }),
  ),
});

const dashboardResponseSchema = z.object({
  baseline: baselineFootprintResultSchema.nullable(),
  gamification: gamificationSummarySchema,
  missions: z.array(
    z.object({
      missionId: z.string(),
      title: z.string(),
      target: z.number(),
      progress: z.number(),
      progressPct: z.number(),
      completed: z.boolean(),
    }),
  ),
  recentActions: z.array(actionLogEntrySchema),
  suggestions: z.array(actionDefinitionSchema),
  analogies: z.object({ treesEquivalent: z.number(), kmNotDriven: z.number(), phoneCharges: z.number() }),
});

const healthResponseSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
  uptimeSec: z.number(),
  demoMode: z.boolean(),
});

const userStateSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  createdAtISO: z.string(),
  baseline: baselineFootprintResultSchema.optional(),
  survey: baselineSurveySchema.optional(),
  gamification: gamificationStateSchema,
  joinedVia: z.union([z.literal('quiz'), z.literal('survey')]).optional(),
});

const suryaGharResultSchema = z.object({
  recommendedKw: z.number(),
  subsidyInr: z.number(),
  capexInr: z.number(),
  netCostInr: z.number(),
  annualGenerationKwh: z.number(),
  annualSavingInr: z.number(),
  paybackYears: z.number(),
  co2AvoidedKgPerYear: z.number(),
  freeUnitsNote: z.string(),
  checklist: z.array(z.string()),
  portalUrl: z.string(),
  loanNote: z.string(),
});

const kusumResultSchema = z.object({
  component: z.union([z.literal('A'), z.literal('B'), z.literal('C')]),
  subsidyBreakdown: z.object({
    centralPct: z.number(),
    statePct: z.number(),
    farmerPct: z.number(),
    centralInr: z.number(),
    stateInr: z.number(),
    farmerInr: z.number(),
    farmerUpfrontApproxInr: z.number(),
  }),
  estCostInr: z.number(),
  farmerShareInr: z.number(),
  dieselSavedLitresPerYear: z.number(),
  co2AvoidedKgPerYear: z.number(),
  checklist: z.array(z.string()),
  officialLink: z.string(),
  componentASuggestion: z
    .object({
      component: z.literal('A'),
      landAcres: z.number(),
      estLeaseIncomeInrPerYear: z.number(),
      note: z.string(),
    })
    .optional(),
});

const evFitResultSchema = z.object({
  recommendation: z.union([
    z.literal('public-transport-first'),
    z.literal('ev-two-wheeler'),
    z.literal('ev-car'),
    z.literal('hybrid'),
    z.literal('ev-car-with-planning'),
  ]),
  annualCo2SavedKg: z.number(),
  annualFuelSavingInr: z.number(),
  fameNote: z.string(),
  confidence: z.union([z.literal('high'), z.literal('medium')]),
});

const commuteModeSchema = z.union([
  z.literal('car-petrol'),
  z.literal('car-cng'),
  z.literal('two-wheeler'),
  z.literal('ev-2w'),
  z.literal('bus'),
  z.literal('metro'),
  z.literal('cycle-walk'),
]);

const commuteCompareResponseSchema = z.object({
  modes: z.array(
    z.object({ mode: commuteModeSchema, co2Kg: z.number(), costInr: z.number(), annualKgIfDaily: z.number() }),
  ),
  source: z.union([z.literal('maps'), z.literal('estimate')]),
});

const leaderboardResponseSchema = z.object({
  entries: z.array(
    z.object({ rank: z.number(), name: z.string(), points: z.number(), level: z.string(), isYou: z.boolean().optional() }),
  ),
  userRank: z.number().nullable(),
});

const assistantResponseSchema = z.object({
  reply: z.string(),
  mode: z.union([z.literal('gemini'), z.literal('demo')]),
  grounding: z.object({ usedBaseline: z.boolean(), usedSchemes: z.boolean() }),
});

// ── Transport core ────────────────────────────────────────────────────────────

const API_BASE = '/api'; // same-origin; next.config.ts proxies to the API server

// Gemini-backed assistant calls can take several seconds; past 15s a clear
// error beats an indefinite spinner.
const REQUEST_TIMEOUT_MS = 15_000;

// Single source: core's closed code set, as a Set for O(1) membership checks.
const KNOWN_ERROR_CODES: ReadonlySet<string> = new Set(ALL_ERROR_CODES);

function fallbackCodeForStatus(status: number): ErrorCode {
  if (status === 400) return 'VALIDATION_FAILED';
  if (status === 404) return 'NOT_FOUND';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 502) return 'UPSTREAM_FAILURE';
  return 'INTERNAL';
}

/** Normalise any failure body into ApiErrorShape — body shape is untrusted. */
function toApiError(payload: unknown, status: number): ApiErrorShape {
  if (typeof payload === 'object' && payload !== null && 'error' in payload) {
    const inner = (payload as { error: unknown }).error;
    if (typeof inner === 'object' && inner !== null) {
      const candidate = inner as { code?: unknown; message?: unknown };
      if (typeof candidate.code === 'string' && KNOWN_ERROR_CODES.has(candidate.code)) {
        return {
          code: candidate.code as ErrorCode,
          message:
            typeof candidate.message === 'string' ? candidate.message : 'The request failed.',
        };
      }
    }
  }
  return { code: fallbackCodeForStatus(status), message: `Request failed with status ${status}.` };
}

async function request<T>(
  path: string,
  init?: RequestInit,
  schema?: ResponseSchema<T>,
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(init?.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
    // Bodies are untrusted even on 2xx — a proxy can return HTML error pages.
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      return { ok: false, error: toApiError(payload, response.status) };
    }
    if (payload === null) {
      return {
        ok: false,
        error: { code: 'UPSTREAM_FAILURE', message: 'The server returned a non-JSON response.' },
      };
    }
    if (schema !== undefined) {
      const parsed = schema.safeParse(payload);
      if (!parsed.success) {
        // Same envelope toApiError produces for transport faults: a body that
        // fails its contract is as unusable as no body at all.
        return {
          ok: false,
          error: { code: 'UPSTREAM_FAILURE', message: 'Malformed response from server.' },
        };
      }
      return { ok: true, data: parsed.data };
    }
    // Reached only by getGoogleServices (static read-only catalog, no user data).
    return { ok: true, data: payload as T };
  } catch (cause) {
    const aborted = cause instanceof DOMException && cause.name === 'AbortError';
    return {
      ok: false,
      error: {
        code: 'UPSTREAM_FAILURE',
        message: aborted
          ? 'The request timed out — please try again.'
          : 'Could not reach the Carbon Saathi API. Is the server running?',
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

function get<T>(path: string, schema?: ResponseSchema<T>): Promise<ApiResult<T>> {
  return request<T>(path, undefined, schema);
}

function post<T>(path: string, body: unknown, schema?: ResponseSchema<T>): Promise<ApiResult<T>> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) }, schema);
}

// ── Endpoint wrappers (one per SPEC §4 row) ───────────────────────────────────

export function getHealth(): Promise<ApiResult<HealthResponse>> {
  return get('/health', healthResponseSchema);
}

export function getGoogleServices(): Promise<ApiResult<GoogleServicesResponse>> {
  return get('/google/services');
}

export function getActionCatalog(): Promise<ApiResult<ActionCatalogResponse>> {
  return get('/actions/catalog', actionCatalogResponseSchema);
}

export function calculateBaseline(
  survey: BaselineSurveyInput,
): Promise<ApiResult<BaselineResponse>> {
  return post('/footprint/baseline', survey, baselineResponseSchema);
}

export function bootstrapUser(requestBody: BootstrapRequest): Promise<ApiResult<UserState>> {
  return post('/users/bootstrap', requestBody, userStateSchema);
}

export function logAction(requestBody: ActionLogRequest): Promise<ApiResult<ActionLogResponse>> {
  return post('/actions/log', requestBody, actionLogResponseSchema);
}

export function getDashboard(userId: string): Promise<ApiResult<DashboardResponse>> {
  return get(`/dashboard/${encodeURIComponent(userId)}`, dashboardResponseSchema);
}

export function calculateSuryaGhar(
  input: SuryaGharInput,
): Promise<ApiResult<{ result: SuryaGharResult }>> {
  return post('/schemes/surya-ghar', input, z.object({ result: suryaGharResultSchema }));
}

export function adviseKusum(input: KusumInput): Promise<ApiResult<{ result: KusumResult }>> {
  return post('/schemes/kusum', input, z.object({ result: kusumResultSchema }));
}

export function calculateEvFit(input: EvFitInput): Promise<ApiResult<{ result: EvFitResult }>> {
  return post('/ev/fit', input, z.object({ result: evFitResultSchema }));
}

export function compareCommute(
  requestBody: CommuteCompareRequest,
): Promise<ApiResult<CommuteCompareResponse>> {
  return post('/commute/compare', requestBody, commuteCompareResponseSchema);
}

export function getLeaderboard(userId?: string): Promise<ApiResult<LeaderboardResponse>> {
  const query = userId !== undefined ? `?userId=${encodeURIComponent(userId)}` : '';
  return get(`/leaderboard${query}`, leaderboardResponseSchema);
}

export function queryAssistant(
  requestBody: AssistantQueryRequest,
): Promise<ApiResult<AssistantResponse>> {
  return post('/assistant/query', requestBody, assistantResponseSchema);
}

export function quizEstimate(answers: QuizAnswers): Promise<ApiResult<QuizEstimateResponse>> {
  return post('/quiz/estimate', { answers }, quizEstimateResponseSchema);
}

export function setPledge(requestBody: PledgeRequest): Promise<ApiResult<{ pledge: DailyPledge }>> {
  return post('/pledge', requestBody, pledgeResponseSchema);
}
