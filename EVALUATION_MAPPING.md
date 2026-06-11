# Evaluation Mapping

A direct index from each PromptWars rubric axis to the exact files, tests, and docs that
evidence it. Every claim below is verifiable by opening the listed path.

---

## 1. Code Quality

- Strict TypeScript across all workspaces; no `any` anywhere →
  [`tsconfig.base.json`](tsconfig.base.json) (`strict`, `noUnusedLocals`,
  `noImplicitReturns`), extended by every package tsconfig.
- Pure, deterministic domain engine — no clock reads or randomness inside calculators;
  timestamps are parameters → [`packages/core/src/baseline.ts`](packages/core/src/baseline.ts),
  [`packages/core/src/gamification.ts`](packages/core/src/gamification.ts) (`updateStreak(state, logDateISO)`).
- Errors as values, never thrown across boundaries →
  [`packages/core/src/result.ts`](packages/core/src/result.ts),
  [`packages/core/src/errors.ts`](packages/core/src/errors.ts) (code → HTTP status → safe message).
- Single source of truth for every emission factor, each annotated with provenance →
  [`packages/core/src/emission-factors.ts`](packages/core/src/emission-factors.ts)
  (e.g. `0.716 kg CO2e/kWh — CEA CO2 Baseline Database`).
- Shared zod schemas: one contract for API validation and web forms; `.strict()` at
  request boundaries so junk keys are rejected →
  [`packages/core/src/schemas.ts`](packages/core/src/schemas.ts).
- Table-driven rules over branching: badge awards are data + one loop (no copy-pasted
  conditionals, zero non-null assertions) →
  [`packages/core/src/badges.ts`](packages/core/src/badges.ts).
- Derived constants, never re-typed: initiative CO₂ figures compute from
  `EMISSION_FACTORS` so a grid-factor update propagates everywhere →
  [`packages/core/src/initiatives.ts`](packages/core/src/initiatives.ts).
- Exhaustive literal-union mappings: quiz answers are typed unions, so an unmapped
  option is a compile error, not a runtime fallback →
  [`packages/core/src/quick-quiz.ts`](packages/core/src/quick-quiz.ts),
  [`packages/core/src/types.ts`](packages/core/src/types.ts).
- File header comments (responsibility + boundary) on every source file; comments explain
  *why* (sources, security, efficiency), never restate code → any file under
  [`packages/core/src/`](packages/core/src) or [`apps/api/src/`](apps/api/src).
- Dependency injection in the API: `process.env` is read only in
  [`apps/api/src/config.ts`](apps/api/src/config.ts); routes receive config —
  [`apps/api/src/server.ts`](apps/api/src/server.ts) exports `buildApp(config)` for tests.
- Consistent formatting contract → [`.prettierrc`](.prettierrc), `npm run format:check`.

## 2. Security

- Threat table with mitigations and code paths → [SECURITY.md](SECURITY.md).
- Input validation: every POST body zod-validated, 400 `VALIDATION_FAILED` envelope →
  [`apps/api/src/middleware/validate.ts`](apps/api/src/middleware/validate.ts) +
  [`packages/core/src/schemas.ts`](packages/core/src/schemas.ts).
- Rate limiting: per-IP token bucket, 60/min general, 10/min assistant, 429 on exceed →
  [`apps/api/src/middleware/rate-limit.ts`](apps/api/src/middleware/rate-limit.ts).
- HTTP hardening: helmet with `default-src 'none'` CSP for the API, CORS allowlist from
  `ALLOWED_ORIGINS`, 32 kb JSON limit, `x-powered-by` disabled →
  [`apps/api/src/server.ts`](apps/api/src/server.ts).
- Prompt-injection boundary: untrusted text wrapped in `### USER_INPUT … ### END_USER_INPUT`
  with explicit data-not-instructions framing →
  [`apps/api/src/services/prompt-boundary.ts`](apps/api/src/services/prompt-boundary.ts),
  consumed by [`apps/api/src/services/assistant.ts`](apps/api/src/services/assistant.ts).
- Secret handling: env-only via [`.env.example`](.env.example) (git-ignored real files);
  in production the Gemini key mounts from **Secret Manager** by reference
  ([`scripts/deploy.ps1`](scripts/deploy.ps1)); the evidence route serves env var *names*
  only — an integration test asserts no values leak →
  [`apps/api/src/__tests__/`](apps/api/src/__tests__) (secret-leak assertion),
  [`packages/core/src/google/service-catalog.ts`](packages/core/src/google/service-catalog.ts).
- Web-origin headers: `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, HSTS on every
  page → [`apps/web/next.config.ts`](apps/web/next.config.ts) `headers()`.
- Rate-limit integrity on Cloud Run: `trust proxy` narrowed to the single trusted hop so
  spoofed `X-Forwarded-For` chains cannot mint fresh buckets →
  [`apps/api/src/server.ts`](apps/api/src/server.ts).
- Anti-minting: bootstrap restore clamps client-claimed points to the submitted ledger →
  [`apps/api/src/routes/users.ts`](apps/api/src/routes/users.ts).
- No-PII, local-first design: anonymous profiles, no sign-up, structured logs never contain
  raw user text → [`apps/api/src/middleware/logger.ts`](apps/api/src/middleware/logger.ts),
  privacy pledge at [`apps/web/app/about/`](apps/web/app/about).

## 3. Efficiency

- Documented decision table → [ARCHITECTURE.md → Efficiency decisions](ARCHITECTURE.md#efficiency-decisions).
- Zero-runtime-dependency core (zod only) → [`packages/core/package.json`](packages/core/package.json).
- In-memory store behind a pagination-ready interface (no premature DB hops) →
  [`apps/api/src/services/store.ts`](apps/api/src/services/store.ts).
- Deterministic fallbacks instead of network retries when keys are absent →
  [`apps/api/src/services/gemini-client.ts`](apps/api/src/services/gemini-client.ts),
  [`apps/api/src/services/maps-client.ts`](apps/api/src/services/maps-client.ts).
- Assistant token budget: ≤180-word replies, 1000-char input cap, dedicated stricter
  rate bucket → [`apps/api/src/services/assistant.ts`](apps/api/src/services/assistant.ts).
- 32 kb body cap rejects oversized payloads pre-parse →
  [`apps/api/src/server.ts`](apps/api/src/server.ts).
- Web: lazy-loaded heavy components, self-hosted fonts via `next/font`, localStorage
  cache for instant dashboard paint → [`apps/web/lib/storage.ts`](apps/web/lib/storage.ts),
  [`apps/web/next.config.ts`](apps/web/next.config.ts).
- Inline `// Efficiency:` annotations at each perf-relevant line across the codebase.

## 4. Testing

- Full layer matrix with commands and honest gaps → [TESTING.md](TESTING.md).
- Core unit tests — one vitest file per module, realistic Indian scenarios + edge cases →
  [`packages/core/src/__tests__/`](packages/core/src/__tests__)
  (`baseline.test.ts`, `actions.test.ts`, `surya-ghar.test.ts`, `kusum.test.ts`,
  `ev-fit.test.ts`, `commute.test.ts`, `gamification.test.ts`, `emission-factors.test.ts`,
  `schemas.test.ts`, `quick-quiz.test.ts`, `badges.test.ts`, `initiatives.test.ts`,
  `result.test.ts`, `errors.test.ts`, `service-catalog.test.ts`, `index.test.ts`).
- API integration tests — vitest + supertest against `buildApp(config)`: success paths,
  validation 400s, rate-limit 429, secret-leak assertion, assistant demo grounding, the
  pledge → 1.2× bonus flow, and badge-award flows →
  [`apps/api/src/__tests__/`](apps/api/src/__tests__) (incl. `quiz.test.ts`,
  `pledge.test.ts`).
- Web component tests — vitest + Testing Library + jsdom: ProgressRing, Stepper, Tabs,
  Toast, Button, QuizWidget, DailyPledgeCard, BadgeWall, api-client error paths, storage
  corruption recovery → `apps/web` test files.
- E2E — Playwright: [`e2e/smoke.spec.ts`](e2e/smoke.spec.ts),
  [`e2e/journey.spec.ts`](e2e/journey.spec.ts) (onboarding → dashboard → action log →
  points increase; the landing-quiz funnel through to the earned badge; initiatives
  filtering), [`e2e/schemes.spec.ts`](e2e/schemes.spec.ts) (₹78,000 subsidy visible
  for 350 units), [`e2e/assistant.spec.ts`](e2e/assistant.spec.ts).
- A11y automation — axe-core across all 11 routes, zero serious/critical →
  [`e2e/a11y.spec.ts`](e2e/a11y.spec.ts).
- CI runs the full pyramid (type-check, tests, production build, e2e + a11y) on every
  push → [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
- Run: `npm test` (unit + integration + component), `npm run e2e`, `npm run a11y` —
  wired in [`package.json`](package.json) and [`playwright.config.ts`](playwright.config.ts).

## 5. Accessibility

- Decision log with computed contrast ratios, keyboard map, and gaps →
  [ACCESSIBILITY.md](ACCESSIBILITY.md).
- Design tokens meeting 4.5:1 in light and dark themes →
  [`apps/web/app/globals.css`](apps/web/app/globals.css) (`:root` + `[data-theme='dark']`).
- Skip-link, semantic landmarks, labelled inputs, focus-visible rings →
  [`apps/web/components/layout/`](apps/web/components/layout).
- `aria-live` announcements for toasts and points; chat uses `role="log"` with a labelled
  input → [`apps/web/app/actions/`](apps/web/app/actions),
  [`apps/web/app/assistant/`](apps/web/app/assistant).
- Reduced motion honoured twice: CSS `prefers-reduced-motion` + framer-motion
  `useReducedMotion` guards → [`apps/web/app/globals.css`](apps/web/app/globals.css),
  animated components under [`apps/web/components/`](apps/web/components).
- Automated enforcement: axe scan in CI-runnable form → [`e2e/a11y.spec.ts`](e2e/a11y.spec.ts),
  `npm run a11y`.

## 6. Google Services

- Per-service contract (status / env vars / fallback / code paths / activation steps) →
  [GOOGLE_SERVICES.md](GOOGLE_SERVICES.md).
- Typed evidence catalog served by the API — the repo *self-reports* its integrations →
  [`packages/core/src/google/service-catalog.ts`](packages/core/src/google/service-catalog.ts),
  route `GET /api/google/services`, page
  [`apps/web/app/google-services/`](apps/web/app/google-services).
- Gemini API (`implemented`) — grounded assistant with demo fallback →
  [`apps/api/src/services/gemini-client.ts`](apps/api/src/services/gemini-client.ts),
  [`apps/api/src/services/assistant.ts`](apps/api/src/services/assistant.ts).
- Maps Distance Matrix (`ready-with-key`) — live distances with labelled estimate fallback →
  [`apps/api/src/services/maps-client.ts`](apps/api/src/services/maps-client.ts).
- Cloud Run (`implemented`, **live**) — both services deployed in asia-south1:
  web <https://carbon-saathi-web-ktdjm6xcyq-el.a.run.app>, API health
  <https://carbon-saathi-api-ktdjm6xcyq-el.a.run.app/api/health> (`demoMode: false`) →
  [`apps/api/Dockerfile`](apps/api/Dockerfile), [`apps/web/Dockerfile`](apps/web/Dockerfile),
  [`cloudbuild-api.yaml`](cloudbuild-api.yaml), [`cloudbuild-web.yaml`](cloudbuild-web.yaml),
  [`scripts/deploy.ps1`](scripts/deploy.ps1).
- Cloud Build + Artifact Registry (`implemented`) — server-side build/push/deploy
  pipelines and regional image storage → the two cloudbuild yamls above.
- Cloud Logging (`implemented`) — the live API streams structured JSON lines →
  [`apps/api/src/middleware/logger.ts`](apps/api/src/middleware/logger.ts).
- Secret Manager (`implemented`) — the Gemini key mounts by reference with
  least-privilege accessor IAM → [`scripts/deploy.ps1`](scripts/deploy.ps1).
- Firebase Auth / Firestore / Hosting (`planned`), GA4 + Maps (`ready-with-key`) with
  concrete seams already in code →
  [`apps/api/src/services/store.ts`](apps/api/src/services/store.ts) (UserStore interface),
  [`.env.example`](.env.example), [`tasks.md`](tasks.md) Phase 7.

---

**Status vocabulary used throughout the repo:** `implemented` (works today, tested) ·
`ready-with-key` (code shipped; add an env var to go live) · `planned` (documented seam,
roadmap phase in [tasks.md](tasks.md)). Labels are honest by policy — nothing is claimed
as live that is not.
