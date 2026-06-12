# Carbon Saathi — Agent Instructions

**Always read this file at the start of every session before doing any work in this project.**

---

## Quick Status

- **Project:** PromptWars hackathon — gamified climate-footprint calculator + Gemini coach for India
- **Status:** v0.3.0 live on Cloud Run (asia-south1)
- **Live URLs:** 
  - Web: https://carbon-saathi-web-ktdjm6xcyq-el.a.run.app
  - API health: https://carbon-saathi-api-ktdjm6xcyq-el.a.run.app/api/health
- **GitHub:** https://github.com/paras-lehana/carbon-saathi (public, user is owner)
- **GCP Project:** `event-manager-promptwars` (Asia South1)
- **Deadline:** ~2026-06-24 (one submission attempt remaining)

---

## v0.3.0 Summary (What Just Shipped)

**Code Quality dedup & infrastructure:**
- Eliminated all duplication: INPUT_CLASS×7 → 1, useFadeUp×6 → 1, seedDemo×2 → 1, bounds mirrors×4 → core schema
- Repo-wide ESLint (flat config, typescript-eslint); zero suppressions
- Core domain: 99.36% statement coverage, 100% function coverage
- tsconfig.test.json per workspace + tsconfig.e2e.json for strict test checking

**Security:**
- KUSUM routing bug fixed ("solar pump" now routes to PM-KUSUM, not Surya Ghar)
- Assistant points corrected (15 pts → 16 pts per `pointsForCo2(1.55)`)
- `validate.ts`: `safeIssueMessage()` blocks unrecognized-key reflection attacks
- `prompt-boundary.ts`: hashless `END_USER_INPUT` delimiters neutralised
- `config.ts`: `require()` → `createRequire` + runtime version check (no casts)
- Commute route: dedicated rate-limit bucket (Maps API is billable)
- Dockerfiles: digest-pinned node:22-alpine@sha256:9385cd…
- CI: SHA-pinned actions + `--audit-level=high` (postcss unfixable — Next pins it exactly)

**Accessibility:**
- Dark-theme `--on-primary` token: WCAG 1.4.3 compliant (white in light ~7.3:1, dark ink in dark ~9.5:1)
- BadgeWall: Escape-to-dismiss (WCAG 1.4.13)
- DailyPledge: focus moves to heading on async state change
- Header: desktop nav in semantic `<ul>/<li>`
- All 20+ `list-none` lists: `role="list"` (Safari/VoiceOver compat)
- Chat log: keyboard-scrollable with focus-visible ring
- e2e/a11y.spec.ts: dark-theme axe scans added

**Testing:**
- **260 tests** (131 core + 71 API + 58 web), up from 224
- New: contexts.test.tsx, survey-form.test.ts, clients.test.ts, middleware.test.ts, time.test.ts
- IST clock de-flaked (pledge, footprint-users midnight boundaries)

---

## Stack & Architecture

- **Monorepo:** `packages/core` (TS domain, zero deps), `apps/api` (Express), `apps/web` (Next.js 15)
- **Core boundary:** `Result<T, AppError>` for all cross-module errors (no throws)
- **Validation:** zod schemas in core; shared between API POST validation + web form validation
- **Rate limiting:** per-IP token bucket; commute route stricter (Maps billable)
- **Gemini key:** Secret Manager injection at runtime (never committed)
- **Demo mode:** `DEMO_MODE` env var degrades all features to deterministic fallbacks (CI uses)

---

## Key Files to Know

| Path | Purpose |
|---|---|
| `packages/core/src/result.ts` | Result<T,E> type; marquee file for evaluators |
| `packages/core/src/schemas.ts` | All zod validators + bounds constants (SURVEY_BOUNDS, SURYA_GHAR_BOUNDS, KUSUM_BOUNDS, EV_FIT_BOUNDS) |
| `packages/core/src/emission-factors.ts` | CEA grid factor (0.716 kg CO₂/kWh) + appliance factors (100% sourced, JSDoc cited) |
| `apps/api/src/services/assistant.ts` | Gemini grounding + bounds checking (KUSUM routing, points math) |
| `apps/api/src/middleware/validate.ts` | Request validation + reflection attack mitigation |
| `apps/web/app/onboarding/components/survey-form.ts` | 5-step survey (electricity, LPG, commute, flights, diet, shopping) |
| `apps/web/app/dashboard/components/DashboardGrid.tsx` | Post-quiz bento: donut, badges, streaks, pledge |
| `e2e/a11y.spec.ts` | Automated a11y scans (light + dark theme) |
| `.github/workflows/ci.yml` | Type-check, lint, test, build gates |
| `cloudbuild-api.yaml` / `cloudbuild-web.yaml` | Cloud Build configs for Cloud Run deploy |

---

## Local Development

```bash
# Install & build
npm install
npm run build

# Run all tests (260 total)
npm test

# Type-check (includes test/e2e tsconfigs)
npm run type-check

# Lint (repo-wide ESLint + Next lint for web)
npm run lint

# Dev server (API + web concurrently)
npm run dev

# E2E tests
npm run e2e
npm run e2e:headed  # browser visible
npm run a11y        # accessibility scans only
```

---

## Deployment to Cloud Run

```bash
# API
gcloud builds submit --config cloudbuild-api.yaml --project event-manager-promptwars

# Web
gcloud builds submit --config cloudbuild-web.yaml --project event-manager-promptwars
```

Both auto-deploy on successful build. Check status:
- API health: `curl https://carbon-saathi-api-ktdjm6xcyq-el.a.run.app/api/health`
- Web: open https://carbon-saathi-web-ktdjm6xcyq-el.a.run.app

---

## Troubleshooting

**Build fails in Alpine Docker:**
- Symptom: `Cannot find native binding` for lightningcss
- Fix: `apps/web/Dockerfile` drops `package-lock.json` before `npm install` (platform-native resolution)
- Why: npm lockfile generated on Windows only records Win32 binaries; npm ci doesn't re-evaluate

**Type-check fails with `unknown` in test closures:**
- Symptom: `error TS18046: 'n' is of type 'unknown'` in callback
- Fix: Annotate param type when inference from union fails (e.g., `(n: number) => ...`)

**postcss <8.5.10 audit warning in CI:**
- Not fixable: Next.js 15 pins `postcss@8.4.31` exactly in its own package.json
- Impact: Build-time only; never shipped in Cloud Run image
- CI gate: `--audit-level=high` (moderate advisories allowed)

---

## Next Steps (Ranked by Impact)

**Easy wins (< 1 hour each):**
1. Quiz replay from dashboard (currently one-shot)
2. Action log modal (shows all logged actions, supports leaderboard)
3. Initiatives search/filter (25+ items need discoverability)
4. Dark mode toggle (tokens already exist; add a picker button)
5. Gemini streaming (API ready; wire to web UI for real-time tokens)

**Medium (2–4 hours):**
6. Leaderboard filters by action type
7. Firebase sync (currently in-memory; Firestore + multi-device)
8. Maps visualization (EV commute route overlay)
9. State/region picker (calibrate grid-factor for user's location)
10. Referral codes (share dashboard via unique URL)

**Polish (evaluator-focused):**
11. README API examples (curl snippets for every endpoint)
12. SECURITY.md threat matrix (evaluators read this)
13. E2E happy-path test (landing → quiz → dashboard → pledge → chat)
14. Lighthouse CI gate (Core Web Vitals threshold)

---

## Evaluation Context

**Last score (pre-v0.3.0):**
- Code Quality: 89 (target blocker — fixed with dedup + ESLint + coverage)
- Security: 98
- Efficiency: 100
- Testing: 98
- Accessibility: 99
- Problem Statement Alignment: 100

**v0.3.0 should improve Code Quality** (eliminated all duplication, zero ESLint suppressions, 99% coverage). Next improvements should focus on feature completeness or Polish.

---

## Credentials & Access

- **gcloud CLI:** Already authenticated as `paras.lehana@indiamart.com`
- **GitHub:** https://github.com/paras-lehana/carbon-saathi (owner)
- **Cloud Run:** asia-south1, project `event-manager-promptwars`
- **Cloud Build:** Triggers on `gcloud builds submit --config cloudbuild-{api,web}.yaml`

---

**Last updated:** 2026-06-12 (v0.3.0 shipped)
