# Carbon Saathi — v0.3.0 Development Guide

**Status:** Live on Cloud Run (asia-south1). Last submission deadline ~2026-06-24.

## What This Project Is

PromptWars hackathon entry: gamified climate-footprint calculator + Gemini AI coach for India. No auth required — 30-second quiz → personal dashboard with badges, daily pledges, and CO₂ tracking in rupee terms (PM Surya Ghar subsidies, PM KUSUM, EV adoption).

- **Live web:** https://carbon-saathi-web-ktdjm6xcyq-el.a.run.app
- **Live API:** https://carbon-saathi-api-ktdjm6xcyq-el.a.run.app/api/health
- **GitHub:** https://github.com/paras-lehana/carbon-saathi
- **Google Cloud project:** `event-manager-promptwars` (asia-south1)

## Recent Work (v0.3.0)

**Session goal:** Improve evaluation score (Code Quality 89 was the blocker; Security 98, other axes 99–100).

**What landed (85 files):**

1. **Code Quality (dedup + repo-wide ESLint)**
   - Deleted `levels.ts` → re-export from core's `levelForPoints`
   - Shared `INPUT_CLASS` (7 copies → 1), `useFadeUp`/`useFadeUpInView` hooks (6 → 1), `useSeedDemo` (2 → 1), TipsList component
   - `ALL_ERROR_CODES` exported from core; web api-client imports (no mirror)
   - Bounds constants (`SURVEY_BOUNDS`, `SURYA_GHAR_BOUNDS`, `KUSUM_BOUNDS`, `EV_FIT_BOUNDS`) in core schema, consumed by both validation + UI
   - QuizWidget: zod-validated `buildQuizAnswers` (no casts, no dead fragment)
   - Repo-wide ESLint (flat config, typescript-eslint); zero suppressions
   - Coverage: **99.36% statements, 100% functions** on core domain

2. **Security**
   - KUSUM routing bug: "solar pump for farm" now correctly grounds PM-KUSUM (not rooftop Surya Ghar)
   - Assistant points: wrong figure (15 pts) → correct (16 pts per `pointsForCo2(1.55)`)
   - `validate.ts`: `safeIssueMessage()` kills unrecognized-key reflection attacks
   - `prompt-boundary.ts`: hashless `END_USER_INPUT` delimiters neutralised
   - `config.ts`: `require()` → `createRequire` + runtime version check (no casts)
   - Commute route: dedicated rate-limit bucket (Maps API is billable)
   - Dockerfiles: digest-pinned node:22-alpine@sha256:9385cd…
   - CI: SHA-pinned actions + `--audit-level=high` (postcss <8.5.10 unfixable — next pins it exactly; documented as build-time-only)

3. **Accessibility**
   - Dark-theme `--on-primary` token: WCAG 1.4.3 compliant (white in light mode ~7.3:1, dark ink in dark mode ~9.5:1)
   - BadgeWall: Escape-to-dismiss (WCAG 1.4.13)
   - DailyPledge: focus moves to pledged heading on async state change
   - Header: desktop nav in semantic `<ul>/<li>`
   - All 20+ `list-none` styled lists: `role="list"` (Safari/VoiceOver compat)
   - Chat log: `tabIndex={0}` + `focus-visible` ring (keyboard scrollable)
   - e2e/a11y.spec.ts: dark-theme axe scans added

4. **Testing**
   - **260 tests** (131 core + 71 API + 58 web), up from 224
   - New: `contexts.test.tsx`, `survey-form.test.ts`, `clients.test.ts`, `middleware.test.ts`, `time.test.ts`
   - IST clock de-flaked (midnight boundaries in pledge/footprint tests)
   - result.test.ts: explicit type annotation for union-type inference

5. **Infrastructure**
   - README: version blockquote, hero image, Problem/Solution/Stack sections, annotated ASCII tree, Docker quickstart, coverage bullet
   - tsconfig.test.json per workspace + tsconfig.e2e.json for strict test type-checking
   - root eslint.config.mjs (typescript-eslint for core/api/e2e; web uses Next's own)
   - CI gates: type-check + lint + test + build (all green)
   - Dockerfile fixes: lightningcss optional dep + lockfile drop in Alpine build (npm ci bug workaround)

## Current State

- **All tests pass:** 260/260
- **Type-check clean:** core, api, web, e2e, test tsconfigs
- **ESLint clean:** zero errors across core/api/e2e/scripts (web linted separately via Next)
- **Coverage:** 99% on core, measured in CI
- **Deployment:** API + web live on Cloud Run, responding at v0.3.0
- **Git:** main branch + v0.3.0 tag pushed to GitHub

## Next Steps (If Continuing)

### Low-hanging fruit (< 1 hour each):

1. **Quiz/pledge replay UI** — let users retake the quiz from the dashboard (currently one-shot)
2. **Action replay modal** — show all logged actions in a filterable table (supports leaderboard)
3. **Initiatives search/filter** — users are drowning in 25+ initiatives; add a search box
4. **Dark mode toggle** — already have the tokens; just need a theme-picker button
5. **Gemini streaming** — API returns full response; web could stream tokens to `ChatBubble` in real-time

### Medium effort (2–4 hours):

6. **Leaderboard by action** — currently points-only; add filters by initiative type (solar, EV, waste, etc.)
7. **Firebase sync** — User data is in-memory; persist to Firestore + enable multi-device sync
8. **Maps integration** — EV commute calculator works; add a visual route map (already set up in google-services.ts)
9. **IST timezone picker** — household location affects grid factor; allow users to choose state/region
10. **Referral codes** — share a dashboard via a unique URL, see friend's profile

### Polish (evaluation-focused):

11. **README API examples** — curl/REST snippets for every endpoint (evaluators appreciate concrete proof)
12. **SECURITY.md audit trail** — document every threat + mitigation (already started; expand with incident scenarios)
13. **Performance budget** — add Lighthouse CI gate or Core Web Vitals threshold
14. **E2E happy-path** — add a "full user journey" test (landing → quiz → dashboard → pledge → assistant chat)

## Architecture Notes

- **Monorepo:** packages/core (TS domain engine, no deps), apps/api (Express), apps/web (Next.js 15)
- **Core boundary:** Result<T, AppError> for all cross-module errors (no throws)
- **Validation:** zod schemas in core; shared between API POST validation + web form validation
- **Rate limiting:** per-IP token bucket; commute route has stricter cap (Maps billable)
- **Gemini key:** via Secret Manager, never committed; Cloud Run injects at runtime
- **Demo mode:** DEMO_MODE env var degrades all features to deterministic fallbacks (CI uses this)

## Files to Know

| Path | Purpose |
|---|---|
| `packages/core/src/result.ts` | Result<T,E> type; marquee file for evaluators |
| `packages/core/src/schemas.ts` | All zod validators (quiz, survey, bounds, gamification) |
| `packages/core/src/emission-factors.ts` | CEA grid factor (0.716 kg CO₂/kWh) + appliance factors |
| `apps/api/src/services/assistant.ts` | Gemini grounding logic (bounds-checked, no hallucination) |
| `apps/api/src/middleware/validate.ts` | Request validation + reflection attack mitigation |
| `apps/web/app/onboarding/components/survey-form.ts` | 5-step survey wizard (electricity, LPG, commute, flights, diet) |
| `apps/web/app/dashboard/components/DashboardGrid.tsx` | Post-quiz bento: donut, badges, streaks, pledge |
| `e2e/a11y.spec.ts` | Automated a11y scans (light + dark theme) |
| `.github/workflows/ci.yml` | Type-check, lint, test, build gates |
| `cloudbuild-api.yaml` / `cloudbuild-web.yaml` | Cloud Build configs for Cloud Run deploy |

## Troubleshooting

**Build fails in Alpine Docker:**
- Symptom: `Cannot find native binding` for lightningcss
- Fix: apps/web/Dockerfile drops package-lock.json before `npm install` (platform-native resolution)
- Why: npm lockfile generated on Windows only records Win32 binaries; npm ci doesn't re-evaluate

**Type-check fails with `unknown` in test closures:**
- Symptom: `result.test.ts:25: error TS18046: 'n' is of type 'unknown'`
- Fix: Annotate callback params when inference from Result unions fails (e.g., `(n: number) => ...`)

**postCSS <8.5.10 audit warning:**
- Not fixable: Next.js 15 pins postcss@8.4.31 exactly in its own package.json
- Impact: Build-time only; never shipped in Cloud Run image
- CI gate: `--audit-level=high` (moderate advisories allowed)

## Submission Checklist

- [ ] Score evaluator runs and shows improvement (last run: CQ 89 → ?)
- [ ] README links all working (53 verified)
- [ ] Live demo accessible + quiz/pledge functional
- [ ] `/api/health` returns v0.3.0
- [ ] GitHub repo public + all commits pushed
- [ ] EVALUATION_MAPPING.md completed (maps rubric axes to code locations)

## Credentials & Access

- **gcloud CLI:** `gcloud auth login` (user already authenticated as paras.lehana@indiamart.com)
- **GitHub:** https://github.com/paras-lehana/carbon-saathi (public repo, user is owner)
- **Cloud Run:** asia-south1, project `event-manager-promptwars`
- **Cloud Build:** auto-deploys on `gcloud builds submit --config cloudbuild-{api,web}.yaml`

---

**Last updated:** 2026-06-12 (v0.3.0 shipped)  
**User:** paras.lehana@indiamart.com
