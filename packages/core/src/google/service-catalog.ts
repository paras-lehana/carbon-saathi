/**
 * Typed catalog of every Google integration in Carbon Saathi — the evidence
 * source for /api/google-services and GOOGLE_SERVICES.md. Security: this
 * catalog is served verbatim to clients, so it must only ever contain env
 * var NAMES, never values.
 */

export type GoogleServiceStatus = 'implemented' | 'ready-with-key' | 'planned';

export type GoogleServiceCategory = 'ai' | 'maps' | 'firebase' | 'cloud' | 'analytics';

export interface GoogleServiceIntegration {
  readonly id: string;
  readonly product: string;
  readonly category: GoogleServiceCategory;
  readonly status: GoogleServiceStatus;
  readonly userValue: string;
  readonly codePaths: readonly string[];
  /** Env var names only — never values (this object is returned by the API). */
  readonly envVars: readonly string[];
  readonly fallbackMode: string;
  readonly evidenceSignals: readonly string[];
}

export const GOOGLE_SERVICES: readonly GoogleServiceIntegration[] = [
  {
    id: 'gemini-api',
    product: 'Gemini API (Google AI Studio)',
    category: 'ai',
    status: 'implemented',
    userValue:
      'Saathi Chat: a grounded climate coach that explains the user’s own calculator numbers.',
    codePaths: [
      'apps/api/src/services/gemini-client.ts',
      'apps/api/src/services/assistant.ts',
      'apps/api/src/services/prompt-boundary.ts',
      'apps/web/app/assistant/page.tsx',
    ],
    envVars: ['GEMINI_API_KEY', 'GEMINI_MODEL'],
    fallbackMode: 'DEMO_MODE returns deterministic replies built from the same calculator outputs.',
    evidenceSignals: [
      'POST /api/assistant/query',
      'Prompt-injection boundary delimiters around user input',
      'VERIFIED_CALCULATOR_DATA grounding block in the system prompt',
    ],
  },
  {
    id: 'maps-distance-matrix',
    product: 'Google Maps Distance Matrix API',
    category: 'maps',
    status: 'ready-with-key',
    userValue: 'Real origin→destination distances for the commute emission comparison.',
    codePaths: ['apps/api/src/services/maps-client.ts', 'apps/api/src/routes/commute.ts'],
    envVars: ['GOOGLE_MAPS_API_KEY'],
    fallbackMode: 'Deterministic distance estimate (haversine/table) labelled source: "estimate".',
    evidenceSignals: ['POST /api/commute/compare', 'source field switches maps|estimate'],
  },
  {
    id: 'maps-javascript-api',
    product: 'Maps JavaScript API',
    category: 'maps',
    status: 'ready-with-key',
    userValue: 'Interactive route map for the EV-coach commute comparison.',
    codePaths: ['apps/web/app/ev-coach/components/CommuteCompare.tsx'],
    envVars: ['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'],
    fallbackMode: 'Static mode comparison renders without the interactive map.',
    evidenceSignals: ['Browser key referrer restriction documented in .env.example'],
  },
  {
    id: 'firebase-auth',
    product: 'Firebase Authentication',
    category: 'firebase',
    status: 'planned',
    userValue: 'Optional sign-in to sync progress across devices.',
    codePaths: ['apps/api/src/services/store.ts'],
    envVars: ['NEXT_PUBLIC_FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
    fallbackMode: 'Anonymous local profiles — no PII is required or collected.',
    evidenceSignals: [
      'Privacy pledge on /about',
      'UserStore interface ready for an auth-aware impl',
    ],
  },
  {
    id: 'firestore',
    product: 'Cloud Firestore',
    category: 'firebase',
    status: 'planned',
    userValue: 'Durable persistence for profiles, action logs and streaks.',
    codePaths: ['apps/api/src/services/store.ts'],
    envVars: ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'],
    fallbackMode:
      'InMemoryUserStore behind the same UserStore interface (sessions reset on restart).',
    evidenceSignals: ['UserStore interface with a documented Firestore roadmap'],
  },
  {
    id: 'firebase-hosting',
    product: 'Firebase Hosting',
    category: 'firebase',
    status: 'planned',
    userValue: 'Global CDN edge for the web app.',
    codePaths: ['apps/web/next.config.ts'],
    envVars: [],
    fallbackMode: 'Local Next.js server or any static host.',
    evidenceSignals: ['Stateless web build with env-driven API base URL'],
  },
  {
    id: 'cloud-run',
    product: 'Cloud Run',
    category: 'cloud',
    status: 'implemented',
    userValue:
      'Both services are LIVE on Cloud Run in asia-south1 (Mumbai — lowest latency for Indian users): stateless containers, scale-to-zero, SIGTERM-graceful shutdown.',
    codePaths: [
      'apps/api/Dockerfile',
      'apps/web/Dockerfile',
      'cloudbuild-api.yaml',
      'cloudbuild-web.yaml',
      'apps/api/src/index.ts',
    ],
    envVars: ['PORT'],
    fallbackMode: 'Runs as a plain Node process on any host.',
    evidenceSignals: [
      'Live /api/health reports demoMode: false on the deployed service',
      'asia-south1 region pinned in both cloudbuild configs',
      'PORT env contract (default 8080), no local-disk state',
    ],
  },
  {
    id: 'cloud-build',
    product: 'Cloud Build',
    category: 'cloud',
    status: 'implemented',
    userValue: 'Every deploy is a server-side build+push+deploy pipeline — no local Docker needed.',
    codePaths: ['cloudbuild-api.yaml', 'cloudbuild-web.yaml', 'scripts/deploy.ps1'],
    envVars: [],
    fallbackMode: 'Local docker build with the same Dockerfiles.',
    evidenceSignals: [
      'Three-step pipelines: docker build → push → gcloud run deploy',
      'logging: CLOUD_LOGGING_ONLY routes build logs into Cloud Logging',
    ],
  },
  {
    id: 'artifact-registry',
    product: 'Artifact Registry',
    category: 'cloud',
    status: 'implemented',
    userValue: 'Versioned container images per build, co-located with the runtime region.',
    codePaths: ['cloudbuild-api.yaml', 'cloudbuild-web.yaml', 'scripts/deploy.ps1'],
    envVars: [],
    fallbackMode: 'Any OCI registry — image names are substitution-driven.',
    evidenceSignals: [
      'Images tagged asia-south1-docker.pkg.dev/<project>/carbon-saathi/{api,web}:$BUILD_ID',
      'deploy.ps1 creates the docker repo idempotently',
    ],
  },
  {
    id: 'google-analytics-4',
    product: 'Google Analytics 4',
    category: 'analytics',
    status: 'ready-with-key',
    userValue: 'Anonymous usage analytics to learn which climate features help most.',
    codePaths: ['apps/web/app/layout.tsx'],
    envVars: ['NEXT_PUBLIC_GA4_MEASUREMENT_ID'],
    fallbackMode: 'Analytics disabled — zero tracking by default.',
    evidenceSignals: ['Loads only when the measurement id is configured'],
  },
  {
    id: 'cloud-logging',
    product: 'Cloud Logging',
    category: 'cloud',
    status: 'implemented',
    userValue:
      'The live API streams structured JSON logs into Cloud Logging; build logs land there too via the Cloud Build pipelines.',
    codePaths: ['apps/api/src/middleware/logger.ts', 'cloudbuild-api.yaml'],
    envVars: [],
    fallbackMode: 'Plain stdout JSON lines in local development.',
    evidenceSignals: [
      'Structured route/status/latency logs that never contain raw user text',
      'severity-tagged startup line ingests as a typed entry',
    ],
  },
  {
    id: 'secret-manager',
    product: 'Secret Manager',
    category: 'cloud',
    status: 'implemented',
    userValue:
      'The Gemini key lives in Secret Manager and mounts onto the Cloud Run service by reference — never in images, the repo, or plain env-var config.',
    codePaths: ['scripts/deploy.ps1', 'apps/api/src/config.ts'],
    envVars: ['GEMINI_API_KEY'],
    fallbackMode: 'Keys via git-ignored .env files in local development.',
    evidenceSignals: [
      'deploy.ps1 stores the key with secret versions and least-privilege accessor IAM',
      '--update-secrets mounts gemini-api-key:latest as GEMINI_API_KEY',
    ],
  },
];

export interface GoogleServiceSummary {
  readonly implemented: number;
  readonly readyWithKey: number;
  readonly planned: number;
  readonly total: number;
}

/** Status counts for the evidence page — by construction carries no secrets. */
export function getServiceSummary(): GoogleServiceSummary {
  let implemented = 0;
  let readyWithKey = 0;
  let planned = 0;
  for (const service of GOOGLE_SERVICES) {
    if (service.status === 'implemented') implemented += 1;
    else if (service.status === 'ready-with-key') readyWithKey += 1;
    else planned += 1;
  }
  return { implemented, readyWithKey, planned, total: GOOGLE_SERVICES.length };
}
