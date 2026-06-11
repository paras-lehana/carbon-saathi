# Changelog

All notable changes to Carbon Saathi are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[SemVer](https://semver.org/). Phase numbers refer to [tasks.md](tasks.md).

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

[0.1.0]: https://keepachangelog.com/en/1.1.0/
