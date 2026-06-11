# Changelog

All notable changes to Carbon Saathi are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[SemVer](https://semver.org/). Phase numbers refer to [tasks.md](tasks.md).

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
