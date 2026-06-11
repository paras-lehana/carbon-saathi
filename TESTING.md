# Testing

Five layers, each owning a distinct failure class. The domain engine is deterministic by
contract (timestamps and seeds are parameters), so every number on screen is reproducible
in a unit test without mocking clocks or randomness.

## Layer matrix

| Layer | Tooling | Lives in | What it proves | Run |
|---|---|---|---|---|
| Core unit | vitest | [`packages/core/src/__tests__/`](packages/core/src/__tests__) — one file per module | Calculator math: baseline categories, PM Surya Ghar subsidy bands (₹30k/₹60k/₹78k) and payback, KUSUM A/B/C routing + 30/30/40 split, EV-fit decision tree, commute per-mode CO₂/cost, gamification (levels, streak shields, missions), action caps, schema bounds, error taxonomy | `npm run test:core` |
| API integration | vitest + supertest against `buildApp(config)` — no live port needed | [`apps/api/src/__tests__/`](apps/api/src/__tests__) | Route success shapes, `400 VALIDATION_FAILED` on bad bodies, `429 RATE_LIMITED` under flood, error envelope consistency, **secret-leak assertion** on `/api/google/services` (env values must never appear), assistant demo replies grounded in real calculator numbers | `npm run test:api` |
| Web component | vitest + Testing Library + jsdom | `apps/web` (co-located test files) | ProgressRing/Stepper/GlassCard/Toast render + a11y attributes, `api-client` error paths (never throws raw), localStorage corruption recovery | `npm run test:web` |
| E2E | Playwright (chromium), `webServer` boots api :8080 + web :3000 | [`e2e/`](e2e) — [`smoke.spec.ts`](e2e/smoke.spec.ts), [`journey.spec.ts`](e2e/journey.spec.ts), [`schemes.spec.ts`](e2e/schemes.spec.ts), [`assistant.spec.ts`](e2e/assistant.spec.ts) | Landing renders clean (filtered console), full onboarding → dashboard journey, action log raises points, 350 monthly units shows the ₹78,000 subsidy, assistant answers with numbers in demo mode | `npm run e2e` |
| Accessibility | @axe-core/playwright | [`e2e/a11y.spec.ts`](e2e/a11y.spec.ts) | Zero serious/critical axe violations on all 10 routes (`/`, `/onboarding`, `/dashboard`, `/actions`, `/schemes`, `/ev-coach`, `/assistant`, `/leaderboard`, `/google-services`, `/about`) | `npm run a11y` |

Aggregate: `npm test` runs core + API + web suites — currently **161 green tests**
(98 core unit, 36 API integration, 27 web component). The Playwright layer adds **36
more** (smoke, journeys, schemes, assistant, axe scans, screenshot capture) for **197
total**. `npm run type-check` proves strict TS across all workspaces.

## Design choices that make tests honest

- **No clock mocking.** Streak logic takes `logDateISO`; tests pass literal dates and
  assert shield consumption on a missed day ([`gamification.test.ts`](packages/core/src/__tests__/gamification.test.ts)).
- **API tests hit the real app factory.** `buildApp(config)` receives a test config
  (demo mode on, tiny rate-limit window) — the same wiring production uses, no route mocks.
- **Demo mode is the test fixture.** Because demo assistant replies reuse the real
  calculators, e2e can assert *actual numbers* without a Gemini key or network access.
- **Deterministic e2e entry points.** `window.__saathi.seedDemoUser()`
  ([`apps/web/lib/debug.ts`](apps/web/lib/debug.ts)) gives journeys a fast, reproducible
  second path alongside the full onboarding flow; selectors use `data-testid`, not text.
- **Realistic Indian scenarios.** Unit fixtures are real-world shaped: a Delhi metro
  commuter, a 2 BHK with 250 kWh/month and one LPG cylinder, a 5 HP diesel-pump farmer
  with 3 acres of barren land.

## Coverage map (what is asserted where)

- Emission factor integrity (every entry has value/unit/source; spot checks against SPEC
  values like grid 0.716) → [`emission-factors.test.ts`](packages/core/src/__tests__/emission-factors.test.ts)
- Baseline category math + vs-India (~2 t) / vs-urban (~4 t) ratios + top driver →
  [`baseline.test.ts`](packages/core/src/__tests__/baseline.test.ts)
- Action impact bounds (unknown id, qty ≤ 0, qty > maxPerDay rejected) →
  [`actions.test.ts`](packages/core/src/__tests__/actions.test.ts)
- Surya Ghar: kW sizing/clamping, roof cap, subsidy band edges (1/2/3+ kW), payback
  rounding → [`surya-ghar.test.ts`](packages/core/src/__tests__/surya-ghar.test.ts)
- KUSUM: diesel→Component B, grid→C, barren land ≥ 2 acres adds A; diesel litres + CO₂ →
  [`kusum.test.ts`](packages/core/src/__tests__/kusum.test.ts)
- EV-fit branch coverage of the full decision tree →
  [`ev-fit.test.ts`](packages/core/src/__tests__/ev-fit.test.ts)
- Commute mode table (7 modes, round-trip math, cost table) →
  [`commute.test.ts`](packages/core/src/__tests__/commute.test.ts)
- Catalog/evidence integrity (statuses, env var names only) →
  [`service-catalog.test.ts`](packages/core/src/__tests__/service-catalog.test.ts)
- Result/error plumbing → [`result.test.ts`](packages/core/src/__tests__/result.test.ts),
  [`errors.test.ts`](packages/core/src/__tests__/errors.test.ts)
- Zod payload bounds (1–15 household, 30–2000 units, 1–1000-char messages…) →
  [`schemas.test.ts`](packages/core/src/__tests__/schemas.test.ts)

## Honest gaps

- **No live-key tests.** Gemini and Maps clients are exercised in demo/fallback mode only;
  live-path behaviour (quota errors, expired keys) is a Phase 6 task ([tasks.md](tasks.md)).
- **No load testing.** The token bucket is unit/integration tested, not benchmarked under
  realistic concurrency.
- **Coverage is not gated.** Test count and breadth are tracked manually; no `--coverage`
  threshold enforced in CI yet (CI itself is Phase 11).
- **Single browser.** Playwright runs chromium only; firefox/webkit projects are a
  config-line away but unverified.
- **Axe ≠ full WCAG.** Automated scans catch a minority of accessibility issues; manual
  screen-reader passes are documented in [ACCESSIBILITY.md](ACCESSIBILITY.md) as
  best-effort, not certified audit.
