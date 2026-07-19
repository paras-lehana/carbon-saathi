/**
 * buildApp(config): the composition root. Wires security middleware, rate
 * limits, routers and error envelopes around injected dependencies — exported
 * separately from index.ts so supertest can exercise the full stack without
 * binding a port.
 */
import { appError, isAppError } from '@carbon-saathi/core';
import cors from 'cors';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import type { AppConfig } from './config';
import { createRequestLogger } from './middleware/logger';
import { createRateLimiter } from './middleware/rate-limit';
import { sendError } from './middleware/validate';
import { createActionsRouter } from './routes/actions';
import { createAssistantRouter } from './routes/assistant';
import { createCommuteRouter } from './routes/commute';
import { createDashboardRouter } from './routes/dashboard';
import { createEvRouter } from './routes/ev';
import { createFootprintRouter } from './routes/footprint';
import { createGoogleServicesRouter } from './routes/google-services';
import { createHealthRouter } from './routes/health';
import { createLeaderboardRouter } from './routes/leaderboard';
import { createPledgeRouter } from './routes/pledge';
import { createQuizRouter } from './routes/quiz';
import { createSchemesRouter } from './routes/schemes';
import { createUsersRouter } from './routes/users';
import { createGeminiClient } from './services/gemini-client';
import { createLlmChain } from './services/llm-chain';
import { createLlmProxyClient } from './services/llm-proxy-client';
import { InMemoryUserStore, type UserStore } from './services/store';

/** Test seams: every nondeterministic or external dependency is injectable. */
export interface AppDeps {
  readonly now?: () => number;
  readonly fetchFn?: typeof fetch;
  readonly logSink?: (line: string) => void;
  readonly store?: UserStore;
}

/** Body-parser and similar middleware errors expose a numeric status — narrow without `any`. */
function statusOf(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { status?: unknown; statusCode?: unknown };
    if (typeof candidate.status === 'number') return candidate.status;
    if (typeof candidate.statusCode === 'number') return candidate.statusCode;
  }
  return undefined;
}

export function buildApp(config: AppConfig, deps: AppDeps = {}): Express {
  const now = deps.now ?? Date.now;
  const store = deps.store ?? new InMemoryUserStore();
  // Reliability: two independent LLM transports behind one interface. The
  // direct Gemini key is tried first; the internal llm-service proxy takes
  // over when the key is missing or its quota/billing fails, and assistant.ts
  // keeps the final grounded-demo fallback. See llm-chain.ts for the why.
  const gemini = createLlmChain([
    createGeminiClient({
      apiKey: config.geminiApiKey,
      model: config.geminiModel,
      fetchFn: deps.fetchFn,
    }),
    createLlmProxyClient({
      baseUrl: config.llmServiceUrl,
      endpoint: config.llmEndpoint,
      internalKey: config.llmInternalKey,
      model: config.llmModel,
      fetchFn: deps.fetchFn,
    }),
  ]);

  const app = express();

  // Security: hide the framework fingerprint from scanners.
  app.disable('x-powered-by');
  // Cloud Run fronts the container with exactly ONE proxy hop. Trusting only
  // that hop (1, not true) means req.ip comes from Google's front end — a
  // blanket `true` would take the leftmost X-Forwarded-For entry, letting
  // clients rotate spoofed addresses to mint fresh rate-limit buckets.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // Security: a JSON-only API needs no script/style/image sources at all —
      // default-src 'none' neutralises any reflected-content tricks.
      contentSecurityPolicy: {
        useDefaults: false,
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
      },
    }),
  );
  app.use(
    cors({
      // Security: explicit allowlist; cb(null, false) silently omits CORS
      // headers for strangers instead of throwing 500s at them.
      origin: (origin, callback) => {
        callback(null, origin === undefined || config.allowedOrigins.includes(origin));
      },
    }),
  );
  // Security: the largest legitimate payload (a gamification restore) is a few
  // KB — 32kb rejects junk uploads before any JSON parsing effort.
  app.use(express.json({ limit: '32kb' }));
  app.use(createRequestLogger({ now, sink: deps.logSink }));

  app.use(
    '/api',
    createRateLimiter({ capacity: config.rateLimitMax, windowMs: config.rateLimitWindowMs, now }),
  );

  app.use('/api/health', createHealthRouter(config));
  app.use('/api/google', createGoogleServicesRouter());
  app.use('/api/actions', createActionsRouter(store, now));
  app.use('/api/footprint', createFootprintRouter());
  app.use('/api/users', createUsersRouter(store, now));
  app.use('/api/dashboard', createDashboardRouter(store, now));
  app.use('/api/quiz', createQuizRouter());
  app.use('/api/pledge', createPledgeRouter(store, now));
  app.use('/api/schemes', createSchemesRouter());
  app.use('/api/ev', createEvRouter());
  // Security: commute lookups call the billable Maps Distance Matrix API when
  // GOOGLE_MAPS_API_KEY is set — the same stricter bucket the assistant has,
  // so attacker-driven city-pair queries cannot run up the Maps bill.
  app.use(
    '/api/commute',
    createRateLimiter({
      capacity: config.commuteRateLimitMax,
      windowMs: config.rateLimitWindowMs,
      now,
    }),
    createCommuteRouter(config, deps.fetchFn),
  );
  app.use('/api/leaderboard', createLeaderboardRouter(store));
  app.use('/api/assistant', createAssistantRouter({ config, store, gemini, now }));

  // Unknown route → the same envelope shape as every other error.
  app.use((_req, res) => {
    sendError(res, appError('NOT_FOUND', 'Unknown route.'));
  });

  // Final safety net. Security: internal error details never reach clients —
  // the envelope carries only the closed-set code and a safe message.
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (isAppError(error)) {
      sendError(res, error);
      return;
    }
    const status = statusOf(error);
    if (status !== undefined && status >= 400 && status < 500) {
      // Body-parser failures (malformed JSON, >32kb payloads) are client faults.
      sendError(res, appError('VALIDATION_FAILED', 'Request body could not be parsed.'));
      return;
    }
    sendError(res, appError('INTERNAL'));
  });

  return app;
}
