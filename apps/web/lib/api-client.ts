/**
 * Typed client for every Carbon Saathi API endpoint (SPEC §4). Owns transport
 * concerns — timeouts, JSON envelopes, error normalisation. Never throws:
 * every call resolves to ApiResult so pages handle one shape everywhere.
 * 2xx payloads are runtime-validated wherever core already exports schemas
 * for the response (baseline, quiz estimate, pledge); endpoints whose shapes
 * core does not yet model still trust the payload via a typed cast.
 */
import {
  ALL_ERROR_CODES,
  baselineFootprintResultSchema,
  baselineSurveySchema,
  dailyPledgeSchema,
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

// Envelope schemas composed purely from core's shared schemas — no field
// rules are duplicated in web. Endpoints whose payloads core does not yet
// model (health, catalog, dashboard, leaderboard, …) keep the typed cast in
// request() until core grows schemas for them.
const baselineResponseSchema = z.object({ baseline: baselineFootprintResultSchema });
const quizEstimateResponseSchema = z.object({
  baseline: baselineFootprintResultSchema,
  survey: baselineSurveySchema,
});
const pledgeResponseSchema = z.object({ pledge: dailyPledgeSchema });

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
    // No core schema covers this payload yet — trust the SPEC §4 typing.
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
  return get('/health');
}

export function getGoogleServices(): Promise<ApiResult<GoogleServicesResponse>> {
  return get('/google/services');
}

export function getActionCatalog(): Promise<ApiResult<ActionCatalogResponse>> {
  return get('/actions/catalog');
}

export function calculateBaseline(
  survey: BaselineSurveyInput,
): Promise<ApiResult<BaselineResponse>> {
  return post('/footprint/baseline', survey, baselineResponseSchema);
}

export function bootstrapUser(requestBody: BootstrapRequest): Promise<ApiResult<UserState>> {
  return post('/users/bootstrap', requestBody);
}

export function logAction(requestBody: ActionLogRequest): Promise<ApiResult<ActionLogResponse>> {
  return post('/actions/log', requestBody);
}

export function getDashboard(userId: string): Promise<ApiResult<DashboardResponse>> {
  return get(`/dashboard/${encodeURIComponent(userId)}`);
}

export function calculateSuryaGhar(
  input: SuryaGharInput,
): Promise<ApiResult<{ result: SuryaGharResult }>> {
  return post('/schemes/surya-ghar', input);
}

export function adviseKusum(input: KusumInput): Promise<ApiResult<{ result: KusumResult }>> {
  return post('/schemes/kusum', input);
}

export function calculateEvFit(input: EvFitInput): Promise<ApiResult<{ result: EvFitResult }>> {
  return post('/ev/fit', input);
}

export function compareCommute(
  requestBody: CommuteCompareRequest,
): Promise<ApiResult<CommuteCompareResponse>> {
  return post('/commute/compare', requestBody);
}

export function getLeaderboard(userId?: string): Promise<ApiResult<LeaderboardResponse>> {
  const query = userId !== undefined ? `?userId=${encodeURIComponent(userId)}` : '';
  return get(`/leaderboard${query}`);
}

export function queryAssistant(
  requestBody: AssistantQueryRequest,
): Promise<ApiResult<AssistantResponse>> {
  return post('/assistant/query', requestBody);
}

export function quizEstimate(answers: QuizAnswers): Promise<ApiResult<QuizEstimateResponse>> {
  return post('/quiz/estimate', { answers }, quizEstimateResponseSchema);
}

export function setPledge(requestBody: PledgeRequest): Promise<ApiResult<{ pledge: DailyPledge }>> {
  return post('/pledge', requestBody, pledgeResponseSchema);
}
