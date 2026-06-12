/**
 * Environment → AppConfig translation. This is the only module allowed to
 * read process.env; everything else receives an injected AppConfig, so tests
 * build fully-configured apps without mutating global state.
 */
import { createRequire } from 'node:module';

export interface AppConfig {
  readonly port: number;
  readonly nodeEnv: string;
  readonly version: string;
  /** When true every external Google call is replaced by a deterministic local fallback. */
  readonly demoMode: boolean;
  readonly geminiApiKey: string | undefined;
  readonly geminiModel: string;
  readonly mapsApiKey: string | undefined;
  readonly allowedOrigins: readonly string[];
  readonly rateLimitWindowMs: number;
  readonly rateLimitMax: number;
  readonly assistantRateLimitMax: number;
  readonly commuteRateLimitMax: number;
}

// Single source of truth: read once from package.json at module load, so a
// version bump can never leave /api/health reporting a stale number.
// createRequire keeps '../package.json' resolving identically from src/
// (tests) and dist/, and the runtime shape check fails startup fast — a crash
// here beats /api/health reporting a lying version for the process lifetime.
function readPackageVersion(): string {
  const manifest: unknown = createRequire(__filename)('../package.json');
  if (
    typeof manifest === 'object' &&
    manifest !== null &&
    'version' in manifest &&
    typeof manifest.version === 'string'
  ) {
    return manifest.version;
  }
  throw new Error('apps/api/package.json is missing a string "version" field');
}
export const APP_VERSION = readPackageVersion();

const DEFAULT_PORT = 8080; // Cloud Run's conventional default when PORT is not injected

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const value = raw === undefined ? Number.NaN : Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function nonEmpty(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  return trimmed !== undefined && trimmed.length > 0 ? trimmed : undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const geminiApiKey = nonEmpty(env.GEMINI_API_KEY);
  return {
    port: parsePositiveInt(env.PORT, DEFAULT_PORT),
    nodeEnv: env.NODE_ENV ?? 'development',
    version: APP_VERSION,
    // A key flips the assistant live automatically; DEMO_MODE remains an
    // explicit override in either direction. Keyless runs always demo cleanly.
    demoMode:
      env.DEMO_MODE === 'true'
        ? true
        : env.DEMO_MODE === 'false'
          ? false
          : geminiApiKey === undefined,
    geminiApiKey,
    // 2.5-flash: current stable with free-tier quota (2.0-flash returns 429 on new keys).
    geminiModel: nonEmpty(env.GEMINI_MODEL) ?? 'gemini-2.5-flash',
    mapsApiKey: nonEmpty(env.GOOGLE_MAPS_API_KEY),
    allowedOrigins: (env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
    rateLimitWindowMs: parsePositiveInt(env.RATE_LIMIT_WINDOW_MS, 60_000),
    rateLimitMax: parsePositiveInt(env.RATE_LIMIT_MAX, 60),
    assistantRateLimitMax: parsePositiveInt(env.ASSISTANT_RATE_LIMIT_MAX, 10),
    // Same stricter sizing as the assistant: commute lookups can hit the
    // billable Maps Distance Matrix API when GOOGLE_MAPS_API_KEY is set.
    commuteRateLimitMax: parsePositiveInt(env.COMMUTE_RATE_LIMIT_MAX, 10),
  };
}
