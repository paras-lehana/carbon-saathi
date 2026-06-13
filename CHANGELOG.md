# Changelog

All notable changes to Carbon Saathi are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[SemVer](https://semver.org/). Phase numbers refer to [tasks.md](tasks.md).

## [0.4.2] — 2026-06-14

Extended runtime validation to 14 of 15 API endpoints in the web client
(previously only 3 were validated). Every 2xx payload is now schema-checked
before it reaches the UI; a malformed body is normalised to `UPSTREAM_FAILURE`
rather than silently corrupting state.

### Changed

- Added zod response schemas for `getHealth`, `getActionCatalog`, `bootstrapUser`,
  `logAction`, `getDashboard`, `calculateSuryaGhar`, `adviseKusum`, `calculateEvFit`,
  `compareCommute`, `getLeaderboard`, `queryAssistant` in `apps/web/lib/api-client.ts`.
  These compose core schemas (`streakStateSchema`, `actionLogEntrySchema`,
  `gamificationStateSchema`, `dailyPledgeSchema`, `baselineFootprintResultSchema`,
  `baselineSurveySchema`) with web-layer shapes defined here once.
- Updated test mocks in `api-client.test.ts` and `QuizWidget.test.tsx` to satisfy
  the new schemas (`level`, `newBadges`, `earnedBadges`, `pledge`, `displayName`,
  `createdAtISO` fields added to match the API contract).
- Only `getGoogleServices` (static read-only catalog, no user data) still uses the
  unvalidated cast.

## [0.4.1] — 2026-06-14

Targeted fixes for the Attempt 3 score regression (Security −1, Testing −2,
Accessibility −1).

### Fixed

- Removed the `Content-Security-Policy` header that contained `'unsafe-inline'`
  in `script-src` (required by Next.js's pre-paint theme script in `layout.tsx`
  and by RSC bootstrap). Having an explicit CSP that acknowledges this bypass
  vector was worse than no CSP from a security-evaluation standpoint. The other
  web-origin headers added in 0.4.0 (`Permissions-Policy`, HSTS `preload`,
  `poweredByHeader: false`) are retained.
- Replaced hardcoded magic-number fixtures in `api-client.test.ts`
  (`vsIndiaAverage: 0.75`, `vsUrbanAffluent: 0.38`, hardcoded tip string) with
  values derived live from `calculateBaselineFootprint` — the same pattern
  already used in `QuizWidget.test.tsx`. Fixtures can now never drift from what
  the real API returns.
- Added `SCORE_DECREASE_ANALYSIS.md` documenting root causes and priority fixes
  for the Attempt 2→3 regression.

## [0.4.0] — 2026-06-12

One source of truth for every pattern: shared UI/hook primitives adopted across the
web app, runtime-validated API responses, hardened web-origin headers, and a clean
production dependency audit.

### Added

- Shared web primitives, each with tests: `SectionCard` (the card+heading scaffold,
  previously hand-typed ~50×), `RetryCard`, `CardSkeleton`, `SchemeChecklistCard`,
  `SchemePortalLink`, `ActionLogList`, and hooks `useApiQuery` (stale-response +
  unmount guards, retry), `useApiSubmit` (pending + error toast), `useWizard`
  (clamped steps + focus management), `fieldErrorsFromZod` (core schemas → inline
  field errors).
- Quiz replay from the dashboard: "Retake quiz" opens the onboarding quiz in a
  modal and refreshes the dashboard on completion.
- Runtime validation of API success payloads in the web client wherever core
  exports the matching zod schema (quiz estimate, baseline, pledge) — 2xx bodies
  are no longer blind-cast.
- Per-user mutation serialization in the API store (`mutateUser`) closing the
  read-modify-write race on concurrent action logs; regression test included.
- Web origin security headers: full `Content-Security-Policy`, `Permissions-Policy`,
  HSTS `preload`, `poweredByHeader` off; RFC 9116 `/.well-known/security.txt`; private
  vulnerability-reporting channel documented in SECURITY.md.
- Repo hygiene: `.editorconfig`, `CONTRIBUTING.md`, `round2` and quiz/scheme/EV
  bounds exported from core as the single source for every consumer.

### Changed

- `DashboardGrid` decomposed from a 335-line component into 11 per-section
  components; `ev-coach` page from 304 to 142 lines with extracted step fields;
  scheme panels deduplicated through the shared checklist/portal/submit primitives.
- All deep `../../../` imports (127 across 26 files) migrated to the configured
  `@/` alias.
- Client-side validation now runs the same core zod schemas the API enforces
  (scheme panels, EV coach); localStorage mirrors are schema-validated on restore
  and self-heal when invalid.
- Assistant grounding reads scheme bounds from core constants instead of re-typed
  literals; landing-page benchmark copy is computed from `EMISSION_FACTORS`.
- Production dependency audit is clean: the `postcss` override now resolves under
  `next` (stale lockfile regenerated); CI audit gate restored to `moderate`; the web
  Docker image installs with deterministic `npm ci` again.

## [0.3.0] — 2026-06-12

Quality, accessibility and test-depth push across all three workspaces.

### Added

- Repo-wide ESLint (flat config, typescript-eslint) with zero suppressions; lint
  scripts in every workspace plus the e2e tree.
- 36 new tests (260 total then): provider contexts, survey form mapping, Gemini/Maps
  clients, logger/rate-limit middleware, IST time helpers; API tests de-flaked with
  a frozen IST clock.
- Dark-theme axe scans in the e2e suite; `--on-primary` token pairing WCAG-compliant
  text onto primary fills in both themes.
- `tsconfig.test.json` per workspace + root `tsconfig.e2e.json` so tests and e2e
  specs sit inside the same strict type-check gate as source.

### Changed

- Deduplicated web styling/scaffolding (shared `INPUT_CLASS`, motion hooks,
  `useSeedDemo`, `TipsList`); web level engine replaced by core's `levelForPoints`.
- KUSUM routing fixed in assistant grounding ("solar pump" → PM-KUSUM); demo-reply
  points figure derived from the engine (16 pts) instead of a hand-typed literal.
- Validation error messages sanitised against unknown-key reflection; hashless
  prompt-boundary delimiters neutralised; commute route gained its own rate bucket.
- Dockerfiles digest-pinned; CI actions SHA-pinned with a dependency-audit step.

## [0.2.0] — 2026-06-11

Live deployment + instant gamification: Phases 6 (live Gemini), 6.5 (quiz/badges/
pledge), the Phase 7 initiatives hub, and most of Phase 11 (Cloud Run, CI, Secret
Manager). Both services are live on Cloud Run (asia-south1).

### Added

**Instant gamification (Phase 6.5)**

- 30-second landing quiz: 5 questions → instant CO₂ estimate → dashboard with the
  first badge, no sign-up (`quick-quiz.ts`, `POST /api/quiz/estimate`, `QuizWidget`).
- 8-badge catalog with table-driven award rules (`badges.ts`), evaluated server-side
  at bootstrap and action-log time; badge-earned toasts and a dashboard badge wall.
- Daily pledge with a real 1.2× points bonus: `POST /api/pledge` records the
  commitment, the action-log route pays the bonus exactly once (`bonusApplied`).
- IST day boundaries for streaks/caps/pledges (`istDayISO`) — days roll at midnight
  in India, not 05:30.

**Initiatives Hub (Phase 7, catalog portion)**

- `/initiatives`: 25+ sourced initiatives across Mission LiFE themes with CO₂/₹
  figures derived from `EMISSION_FACTORS` (grid-factor changes propagate), per-figure
  derivation comments, community-scale labelling, and official portal links.

**Live Google activation + deployment (Phases 6 & 11)**

- Live Gemini on `gemini-2.5-flash` (2.0-flash 429s on new keys); thinking tokens
  disabled for direct, budget-friendly replies. Deployed `demoMode: false`.
- Cloud Run deployment for API and web (multi-stage non-root Dockerfiles, Next.js
  standalone output), built by Cloud Build into Artifact Registry — one command via
  `scripts/deploy.ps1`.
- Secret Manager: the Gemini key mounts by reference with least-privilege accessor
  IAM — never in images, the repo, or plain env-var config.
- GitHub Actions CI (type-check, full test pyramid, production build, e2e + a11y)
  with a least-privilege workflow token.
- Web security headers (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, HSTS) via
  `next.config.ts` — the browser-facing origin now matches the API's helmet posture.

**Tests**

- New suites: badges, quick-quiz, initiatives, schemas back-compat (core);
  quiz + pledge integration incl. the bonus flow and badge awards (API);
  QuizWidget, DailyPledgeCard, BadgeWall (web RTL); the quiz journey and
  `/initiatives` axe scan (e2e).

### Fixed

- Quiz and pledge endpoints read the validated body via `parsedBody` (both
  previously 500'd on every request).
- 'No AC' quiz answer scored as 0 AC hours (a `||` fallback turned 0 into 4).
- `estimateFromQuiz` returns a typed `Result` (a CommonJS `require` had erased the
  type and double-wrapped the wire payload).
- Action-log responses now carry `earnedBadges`/`pledge`/`newBadges`, so logging no
  longer wipes the client's local badge mirror.
- Rate limiting hardened: `trust proxy` narrowed to Cloud Run's single hop, closing
  an X-Forwarded-For spoof that minted fresh rate-limit buckets.
- Bootstrap restore clamps client-claimed points to what the submitted action log
  supports (no leaderboard minting in one curl).
- Missing design tokens (`surface-alt`, `success`) added; invisible quiz progress
  track and unstyled states fixed.

### Changed

- Default Gemini model: `gemini-2.0-flash` → `gemini-2.5-flash`.
- Version reported by `/api/health` now reads from `package.json` (single source).
- Request schemas are `.strict()` — unknown keys are rejected at the boundary.
- Google service catalog: 12 integrations, six implemented (Gemini, Cloud Run,
  Cloud Build, Artifact Registry, Cloud Logging, Secret Manager).

## [0.1.0] — 2026-06-11

Initial release: the complete keyless-demo product for Google PromptWars, covering
Phases 0–5. Built with Google Antigravity + Gemini.

### Added

**Foundation (Phase 0)**

- npm-workspaces monorepo (`packages/core`, `apps/api`, `apps/web`), strict
  `tsconfig.base.json`, Prettier, MIT license.
- `.env.example` as the environment schema-of-record — every variable documents its
  no-key fallback; `DEMO_MODE=true` default means the app runs fully with zero keys.

**Domain engine — `@carbon-saathi/core` (Phase 1)**

- India-specific `EMISSION_FACTORS` with per-entry provenance (CEA grid factor
  0.716 kg CO₂e/kWh, LPG cylinder 42.3 kg, metro 0.015 kg/pax-km, …).
- `calculateBaselineFootprint()` — survey → annual per-person footprint by category,
  benchmarked against the India average (~2 t) and urban affluent (~4 t).
- PM Surya Ghar calculator: kW sizing, central subsidy bands ₹30,000 / ₹60,000 /
  ₹78,000 (cap), 300-free-units narrative, payback years, application checklist.
- PM KUSUM advisor: Component A/B/C routing with the 30% central + 30% state /
  40% farmer split, diesel displacement, CO₂ avoided.
- EV-fit recommendation engine, 7-mode commute comparison, 12-action catalog with
  anti-gaming `maxPerDay` caps.
- Gamification: points (`kg × 10`), five levels (Seed → Forest), streaks with earnable
  shields, weekly missions, impact analogies — all pure functions (dates passed in).
- `Result<T, AppError>` error model, shared zod schemas, typed Google-service catalog.
- One vitest suite per module with realistic Indian fixtures and band-edge cases.

**API — `@carbon-saathi/api` (Phase 2)**

- Express 4 `buildApp(config)` factory (Cloud Run-ready: PORT contract, stateless,
  env-only config via a single loader).
- Hardening: helmet CSP (`default-src 'none'`), CORS allowlist, 32 kb JSON cap, per-IP
  token bucket (60/min; 10/min assistant), structured JSON logs without raw user text.
- 13 routes: health, Google-services evidence, action catalog, baseline, bootstrap,
  action log, dashboard, Surya Ghar, KUSUM, EV fit, commute compare, leaderboard,
  assistant.
- Assistant grounding pipeline: intent routing → core calculators →
  `VERIFIED_CALCULATOR_DATA` injection → prompt-injection boundary delimiters → Gemini
  (`gemini-2.0-flash`); deterministic demo replies reuse the same calculator outputs.
- Maps Distance Matrix client with labelled `estimate` fallback; `UserStore` interface
  with in-memory implementation (Firestore drop-in planned); seeded demo leaderboard.
- Integration tests incl. rate-limit 429 and a secret-leak assertion on the evidence
  route.

**Web — `@carbon-saathi/web` (Phase 3)**

- Next.js 15 App Router, React 19, Tailwind v4; eco-modern design tokens (light/dark),
  Space Grotesk + Inter via `next/font`, glassmorphism + bento system, framer-motion
  guarded by `useReducedMotion`.
- 10 pages: landing, onboarding wizard, dashboard, actions, schemes, EV coach, Saathi
  Chat, leaderboard, Google-services evidence, about (privacy pledge + disclaimers).
- Typed api-client (never throws raw; auto-rebootstrap on 404), localStorage mirror
  with corrupt-JSON recovery, `window.__saathi` debug hooks for deterministic e2e,
  component tests (RTL + jsdom).

**Quality pass (Phase 4)**

- Playwright e2e: smoke, full journey, schemes math (₹78,000 visible for 350 units),
  assistant demo grounding; screenshots captured to `e2e/screenshots/`.
- Automated accessibility: axe-core scan across all 10 routes, zero serious/critical
  violations; workspace-wide type-check clean.

**Documentation (Phase 5)**

- README (highlights table, quick start, file index), ARCHITECTURE,
  EVALUATION_MAPPING, SECURITY (threat table + responsible-AI notes), TESTING (layer
  matrix + honest gaps), ACCESSIBILITY (contrast ratios + keyboard map),
  GOOGLE_SERVICES (per-service contract + live-mode walkthrough), PROMPTS (staged
  Antigravity build prompts), this changelog.

### Notes

- Sessions are in-memory server-side by design at this version (the web client
  self-heals on API restart); durable Firestore persistence and Firebase Auth are
  Phase 7 on the roadmap.
- All scheme outputs are estimates with official-portal links — not financial advice.

[0.2.0]: https://github.com/paras-lehana/carbon-saathi/releases/tag/v0.2.0
[0.1.0]: https://github.com/paras-lehana/carbon-saathi/commits/main
