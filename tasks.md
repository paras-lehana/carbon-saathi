# Carbon Saathi — Build Plan & Task Tracker

> Phase-wise execution plan for the PromptWars build. Driven via staged agent prompts in
> [PROMPTS.md](./PROMPTS.md). Legend: ✅ done · 🔄 in progress · ⬜ planned.
>
> Rubric anchors every phase: **Code Quality · Security · Efficiency · Testing ·
> Accessibility · Google Services**.

---

## Phase 0 — Foundation & Scaffolding (Day 1) ✅

- [x] Initialise repository, npm workspaces (`packages/core`, `apps/api`, `apps/web`)
- [x] Root `tsconfig.base.json` (strict), `.prettierrc`, `.gitignore`, MIT `LICENSE`
- [x] `.env.example` as the environment schema-of-record with per-service comments
- [x] Decide architecture: pure-domain core → Express API (Cloud Run-ready) → Next.js web
- [x] Decide degradation tiers: DEMO_MODE → ready-with-key → live (every Google service)

**Acceptance**: `npm install` clean on Node ≥ 20; repo tree matches ARCHITECTURE.md.

## Phase 1 — Core Domain Engine (`packages/core`) (Day 1) ✅

- [x] `result.ts` — `Result<T,E>` + `ok()/err()` helpers (no exceptions across boundaries)
- [x] `errors.ts` — `AppError` taxonomy: code → HTTP status → safe client message
- [x] `types.ts` — all domain interfaces (survey, footprint, actions, schemes, EV, gamification)
- [x] `emission-factors.ts` — India-specific factors, every value annotated with source
- [x] `baseline.ts` — `calculateBaselineFootprint()` per-category annual kg CO2e + comparisons
- [x] `actions.ts` — 12-action catalog + `calculateActionImpact()` with bounds validation
- [x] `surya-ghar.ts` — PM Surya Ghar sizing, ₹30k/60k/78k subsidy bands, payback, CO2 avoided
- [x] `kusum.ts` — PM KUSUM component A/B/C advisor with subsidy split + diesel displacement
- [x] `ev-fit.ts` — EV recommendation engine (BEV / 2W-EV / hybrid / public-transport-first)
- [x] `commute.ts` — per-mode CO2 + cost comparison for a given distance
- [x] `gamification.ts` — points, 5 levels (Seed→Forest), streaks with shields, weekly missions, impact analogies
- [x] `schemas.ts` — zod schemas for every API payload (shared by api + web)
- [x] `google/service-catalog.ts` — typed Google-integration catalog (status/env/fallback/evidence)
- [x] Unit tests for every module (vitest) — realistic Indian scenarios + edge cases

**Acceptance**: `npm run test:core` green; calculators deterministic; zero runtime deps besides zod.

## Phase 2 — Backend API (`apps/api`) (Day 1–2) ✅

- [x] `config.ts` — env → `AppConfig` loader; dependency-injected (no `process.env` in routes)
- [x] `server.ts` — `buildApp(config)` factory: helmet CSP, CORS allowlist, 32 kb JSON cap
- [x] Middleware: structured JSON logger (no raw user text), token-bucket rate limiter, zod validator
- [x] Routes: health, footprint, actions, dashboard, schemes (surya-ghar/kusum), ev, commute, leaderboard, assistant, google-services evidence route
- [x] `services/store.ts` — `UserStore` interface + in-memory impl (Firestore impl in Phase 7)
- [x] `services/gemini-client.ts` — Gemini REST integration + deterministic DEMO_MODE fallback
- [x] `services/assistant.ts` — grounding pipeline: intent → run core calculators → inject as verified data → prompt-boundary wrap → Gemini
- [x] `services/maps-client.ts` — Distance Matrix when key present; estimate fallback otherwise
- [x] Integration tests (vitest + supertest): success, validation failure, rate-limit 429, secret-leak assertion on evidence route, assistant demo grounding

**Acceptance**: `npm run test:api` green; `curl /api/health` ok; no secrets in any response.

## Phase 3 — Web Experience (`apps/web`) (Day 1–3) ✅

- [x] Design system: tokens in `globals.css` (light/dark, eco palette, 8 px grid), Space Grotesk + Inter via `next/font`, glassmorphism + bento utilities
- [x] Layout: header nav, footer, skip-link, theme toggle, mobile nav
- [x] `/` landing — animated SVG hero, problem stats, features bento, how-it-works, CTA
- [x] `/onboarding` — 5-step accessible survey wizard → baseline → bootstrap → dashboard
- [x] `/dashboard` — bento grid: category donut, level ring, streak, missions, quick actions, analogies, leaderboard preview
- [x] `/actions` — quick-log cards with steppers, aria-live toasts, today's log
- [x] `/schemes` — PM Surya Ghar + PM KUSUM calculators with results, checklists, official links
- [x] `/ev-coach` — wizard → recommendation + savings card
- [x] `/assistant` — Saathi Chat: suggestion chips, typing indicator, gemini/demo mode badge
- [x] `/leaderboard` — ranked table, your-row highlight, circle join (demo)
- [x] `/google-services` — live evidence page rendering the API catalog
- [x] `/about` — mission, privacy pledge, scheme disclaimers
- [x] Contexts + localStorage mirror with corrupt-state recovery; typed api-client
- [x] `window.__saathi` debug hooks for deterministic e2e
- [x] Component tests (vitest + RTL)

**Acceptance**: all routes render without API keys; keyboard-only journey possible; dark mode persists.

## Phase 4 — Testing, A11y & Hardening Pass (Day 2–3) ✅

- [x] Playwright e2e: smoke, full user journey, schemes math, assistant, leaderboard
- [x] `a11y.spec.ts` — axe-core scan across 10 routes, zero serious/critical violations
- [x] Screenshot capture of key flows into `e2e/screenshots/`
- [x] Type-check + lint clean across workspaces

**Acceptance**: `npm test` ≥ 70 green tests; `npm run e2e` + `npm run a11y` pass locally.

## Phase 5 — Documentation & Evaluation Visibility (Day 3) ✅

- [x] README.md (highlights table, quick start, file index with "when to read")
- [x] ARCHITECTURE.md (diagrams + data flows) · EVALUATION_MAPPING.md (rubric → file paths)
- [x] SECURITY.md (threat table) · TESTING.md (layer matrix) · ACCESSIBILITY.md (WCAG evidence)
- [x] GOOGLE_SERVICES.md (per-service status/env/fallback) · PROMPTS.md (staged build prompts)
- [x] CHANGELOG.md · this tasks.md

**Acceptance**: every rubric axis reachable from README in ≤ 2 clicks.

---

## Phase 6 — Live Google Activation (Day 3–4) 🔄

- [x] Create Gemini API key (AI Studio); wire via gitignored `.env` + Secret Manager in production
- [x] Flip `DEMO_MODE=false`; verify Saathi Chat on live Gemini (`gemini-2.5-flash` — 2.0-flash 429s on new keys)
- [x] Disable thinking tokens (`thinkingBudget: 0`) so replies stay direct and within budget
- [ ] Maps key + live Distance Matrix on `/api/commute/compare` (origin/destination text inputs)
- [ ] Add GA4 measurement snippet behind `NEXT_PUBLIC_GA4_MEASUREMENT_ID` + event helpers (page_view, baseline_completed, action_logged, scheme_calculated, assistant_query)
- [ ] Negative-path tests: expired key, quota exceeded → graceful fallback banners

**Acceptance**: live chat grounded with calculator numbers; fallbacks still pass with keys removed. ✅ verified on the deployed service (`demoMode: false`).

## Phase 6.5 — Instant Gamification (Day 4) ✅

- [x] Core: `quick-quiz.ts` (5-question 30s quiz → survey mapping → baseline), `badges.ts` (8-badge catalog + table-driven rules), pledge types + 1.2× `applyPledgeBonus`
- [x] API: `POST /api/quiz/estimate`, `POST /api/pledge`; badge evaluation wired into bootstrap + action-log; pledge bonus applied at log time with `bonusApplied` flip
- [x] Web: landing `QuizWidget` (focus-managed, live-region announced), dashboard `BadgeWall` + `DailyPledgeCard`, badge-earned toasts
- [x] Tests: unit (badges/quick-quiz/schemas), integration (quiz/pledge/bonus/badge flows), RTL (all three components), e2e quiz journey

**Acceptance**: cold visitor → quiz → estimate → dashboard with the Quiz Whiz badge in under 60 seconds. ✅

## Phase 7 — Initiatives Hub & Firebase Persistence (Day 4–6) 🔄

- [x] Core: `initiatives.ts` + `INITIATIVE_CATALOG` (25+ entries across 7 categories), `InitiativeCategory` type, `initiativesByCategory()` helper, `scale` flag for community-level figures
- [x] Catalog entries: home-energy (UJALA/BEE/Surya Ghar/induction), mobility (PM E-DRIVE/metro/carpool/engine-off), food (millets/plant-forward/food-waste), waste (segregation/compost/e-waste/reusables), water (rainwater/low-flow), green finance (Green Credit/green deposits/solar loans), community (trees/RWA solar/Miyawaki/LiFE pledge)
- [x] Mission LiFE theme mapping: every category maps to an official LiFE theme; pledge link to merilife.gov.in
- [x] Web route `/initiatives`: category filter pills, cards with benefit/CO₂/₹/how-to, official portal links
- [x] Numbers derived from `EMISSION_FACTORS` with per-figure derivation comments; catalog invariants unit-tested
- [ ] Firebase project wiring; `FirestoreUserStore implements UserStore` (drop-in for in-memory)
- [ ] Collections: `users`, `actions` (subcollection, paginated), `leaderboards` (aggregated doc)
- [ ] Firestore security rules: user-can-only-access-own-data; rules unit tests via emulator
- [ ] Firebase Auth: Google Sign-In (web) + anonymous upgrade path; API verifies ID tokens (Bearer) — replaces trusted `userId` body field
- [ ] Migrate localStorage state → cloud on first sign-in (merge strategy)
- [ ] Leaderboard aggregation via scheduled function or on-write trigger
- [ ] Emulator-suite npm script for offline dev; CI uses emulators

**Acceptance**: `/initiatives` page renders 7 themes with ≥20 cards; Firestore rules pass unit tests; state survives API restart.

## Phase 8 — AI Maps, Bill OCR & Kisan Mode (Day 6–8) ⬜

- [ ] Maps JavaScript API map on `/commute` page (lazy-loaded, ready-with-key)
- [ ] Places Autocomplete for home/office inputs; save named routes per user
- [ ] Directions/Routes API: per-mode polylines + durations; render mode comparison on map
- [ ] Bill upload on `/schemes` (Surya Ghar tab): image drop/choose → `POST /api/bill/extract` → Gemini multimodal vision → JSON `{monthlyUnits, tariffPerUnit, confidence}`
- [ ] Prefill form with extracted values; graceful 501 when no key (show "needs live Gemini")
- [ ] `/kisan` route: Hindi-first simplified flow (large type, ≤ 3 taps); KUSUM advice with Web Speech read-aloud (hi-IN voice)
- [ ] "Greenest route" scoring: combine Distance Matrix + emission factors → AI summary via Gemini
- [ ] Commute streak: detect repeated green-commute logging, bonus multiplier
- [ ] Air-quality layer (Google Air Quality API) on map — pollution-aware route nudges
- [ ] Cache geocoding/route results (in-memory LRU + Firestore) to respect quotas

**Acceptance**: photo of bill produces auto-filled solar calc; `/kisan` flow operable one-handed; map shows 3 modes ranked by CO2.

## Phase 9 — Circles, Gamification 2.0 & Community (Day 8–9) ⬜

- [ ] Circles: create/join via 6-char code; circle leaderboard slice; RWA/office/college presets
- [ ] Weekly team challenges ("Society Solar Sprint") with shared progress bar
- [ ] Badge wallet: SVG badge generator per milestone; share-card image export
- [ ] Streak shields UI + recovery flow; level-up celebration (reduced-motion aware)
- [ ] Seasonal events config (e.g., "Diwali no-cracker pledge") driven from a JSON config
- [ ] Anti-gaming guards: per-day action caps (already in core), anomaly flagging on server

**Acceptance**: two browsers in one circle see each other's points within 5 s (with Firebase).

## Phase 10 — PWA, i18n & Notifications (Day 9–10) ⬜

- [ ] PWA manifest + service worker (offline shell, cached emission factors), install prompt
- [ ] Hindi locale: i18n scaffolding (next-intl), translate nav/dashboard/onboarding/schemes
- [ ] Language toggle persisted; `lang` attribute + screen-reader verification
- [ ] FCM push: weekly mission reminders + streak-at-risk nudge (opt-in, Phase 7 auth required)
- [ ] Email digest (optional roadmap): weekly CO2 report

**Acceptance**: Lighthouse PWA installable; full onboarding journey completable in Hindi.

## Phase 11 — Cloud Deployment & Live URLs (Day 10–11) 🔄

- [x] Dockerfiles (multi-stage, non-root) for API and web; Cloud Build pipelines (`cloudbuild-api.yaml`, `cloudbuild-web.yaml`)
- [x] GitHub Actions: type-check + unit + e2e on push — wired in `.github/workflows/ci.yml` (least-privilege token)
- [x] Deployed to GCP via `scripts/deploy.ps1` — both services live on Cloud Run, asia-south1 (Mumbai)
- [x] Web on Cloud Run for SSR (standalone output), proxying `/api/*` to the API service
- [x] Secret Manager for the Gemini key (mounted by reference; least-privilege accessor IAM)
- [x] Cloud Logging via structured JSON logs + `CLOUD_LOGGING_ONLY` build logs
- [x] README carries the live URLs + notes for evaluators
- [ ] Monitoring dashboards; uptime check on `/api/health`
- [ ] Custom domain

**Acceptance**: public URLs serve the full app; CI green on push; logs visible in Cloud console. ✅ live and verified.

## Phase 12 — Farmer Mode & Bill Intelligence (Day 11–12) ⬜

- [ ] Dedicated `/kisan` flow: KUSUM journey in simplified Hindi-first UI, large touch targets
- [ ] DISCOM/state directory data file + state-specific subsidy overrides
- [ ] Electricity-bill upload → Document AI (or Gemini vision) extraction of units/tariff → auto-fill baseline + Surya Ghar inputs
- [ ] Voice input for assistant (Web Speech API; Cloud Speech-to-Text ready-with-key)
- [ ] Text-to-speech read-aloud for low-literacy users (Cloud TTS ready-with-key)

**Acceptance**: photo of a bill produces a pre-filled solar recommendation; KUSUM flow usable one-handed.

## Phase 13 — Polish, Performance & Submission (Day 12–14) ✅

- [x] Lighthouse pass: Performance ≥ 90, Accessibility ≥ 95 on all key routes; fix findings
- [x] Bundle audit: lazy-load maps/charts, image optimization, font subsetting
- [x] Final content pass: microcopy, empty states, error states, 404 page
- [x] Record 3-min demo video walkthrough; capture final screenshots for README
- [x] Narrative blog post (problem → research → architecture → Google services → results)
- [x] Submission checklist: repo public, README live URL, evaluation docs cross-linked, demo video link, form submitted
- [x] Dry-run the AI evaluator's view: clone fresh, `npm install && npm test && npm run dev` from README alone
- [x] Close-out: A–F summary + PROMPTS.md + tasks.md updated per protocol

**Acceptance**: a stranger (or an AI) can clone, run, and score every rubric axis in < 10 minutes.

### A–F Summary of Final Refactoring (v0.4.0)
- **A (Critical Bugs)**: Resolved all state synchronisation issues and UI logic bugs with React hook restructuring.
- **B (Core Quality)**: Math calculations heavily tested, strict typing preserved. 
- **C (API Quality)**: Schema validations hardened; added retries to api client logic.
- **D (Web Quality)**: Major component deduplication: `DashboardGrid` split into 11 sections. Standardised cards (`RetryCard`, `CardSkeleton`, `SectionCard`).
- **E (Tests)**: Test suite expanded and maintained green (289 total passing tests across core, api, web and e2e). 
- **F (Security)**: `next.config.ts` headers updated, CSP and secure proxy checks maintained.

---

## Backlog / Stretch

- [ ] Commons-style spend-based estimation (UPI statement import, privacy-first local parsing)
- [ ] Carbon offsets marketplace integration (verified Indian projects only)
- [ ] Corporate/college admin dashboard (B2B2C white-label)
- [ ] BigQuery export + Looker Studio public impact dashboard
- [ ] Vertex AI migration path for the assistant (enterprise track)
- [ ] WhatsApp bot via Business API for action logging
