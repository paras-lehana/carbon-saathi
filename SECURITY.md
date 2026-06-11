# Security

Carbon Saathi handles no payments, no passwords, and — by design — no PII. The attack
surface is therefore narrow but treated seriously: every request crosses validated,
rate-limited, hardened boundaries, and the AI assistant treats all user text as untrusted
data. This document is the threat model of record.

## Threat table

| # | Threat | Mitigation | Where | Status |
|---|---|---|---|---|
| 1 | Malformed / malicious request bodies (type confusion, oversized numbers, junk enums, unknown keys) | Every POST body validated by shared zod schemas — request schemas are `.strict()`, so unknown keys are rejected outright; failures return `400 VALIDATION_FAILED` with a safe message and no echo of input. Covers all POST routes including the newer `/api/quiz/estimate` (stateless, validated, unauthenticated) and `/api/pledge` | [`apps/api/src/middleware/validate.ts`](apps/api/src/middleware/validate.ts), [`packages/core/src/schemas.ts`](packages/core/src/schemas.ts) | implemented |
| 2 | Resource-exhaustion via request flooding | Per-IP token bucket: 60 req/min general, dedicated 10 req/min for the assistant (Gemini calls cost money); `429 RATE_LIMITED` on exceed. `trust proxy` is pinned to Cloud Run's single hop, so spoofed `X-Forwarded-For` chains cannot mint fresh buckets | [`apps/api/src/middleware/rate-limit.ts`](apps/api/src/middleware/rate-limit.ts), [`apps/api/src/server.ts`](apps/api/src/server.ts) | implemented |
| 3 | Oversized payload parsing cost | 32 kb JSON body limit rejects before full parse | [`apps/api/src/server.ts`](apps/api/src/server.ts) | implemented |
| 4 | Cross-origin abuse of the API | CORS allowlist from `ALLOWED_ORIGINS` env (default `http://localhost:3000` only; the deployed web origin in production) | [`apps/api/src/server.ts`](apps/api/src/server.ts), [`.env.example`](.env.example) | implemented |
| 5 | Header/content-type attacks, MIME sniffing, clickjacking | API: helmet with `default-src 'none'` CSP (it serves JSON, nothing executable), `x-powered-by` disabled. Web origin: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS on every page | [`apps/api/src/server.ts`](apps/api/src/server.ts), [`apps/web/next.config.ts`](apps/web/next.config.ts) | implemented |
| 6 | **Prompt injection** — user message tries to override the assistant's rules ("ignore previous instructions…") | All untrusted text wrapped in `### USER_INPUT … ### END_USER_INPUT` delimiters; the system prompt declares delimited content to be data, never instructions; grounding numbers come from server-side calculators (`VERIFIED_CALCULATOR_DATA`), so the model has no authority over the math; 1000-char message cap shrinks the injection canvas | [`apps/api/src/services/prompt-boundary.ts`](apps/api/src/services/prompt-boundary.ts), [`apps/api/src/services/assistant.ts`](apps/api/src/services/assistant.ts) | implemented |
| 7 | Secret leakage via code, logs, or API responses | Keys live only in git-ignored `.env` files ([`.env.example`](.env.example) holds names, never values); the `/api/google/services` evidence route serves env var *names* only — an integration test asserts no configured value ever appears in a response; logs are structured `route/status/latencyMs` and never contain raw user text or headers | [`packages/core/src/google/service-catalog.ts`](packages/core/src/google/service-catalog.ts), [`apps/api/src/middleware/logger.ts`](apps/api/src/middleware/logger.ts), [`apps/api/src/__tests__/`](apps/api/src/__tests__) | implemented |
| 8 | Secret management at production scale | The Gemini key lives in Google Secret Manager and mounts onto the Cloud Run service by reference (`--update-secrets`) with a least-privilege accessor binding — never in images, the repo, or plain env-var config. Locally, git-ignored `.env` files | [`scripts/deploy.ps1`](scripts/deploy.ps1), [`apps/api/src/config.ts`](apps/api/src/config.ts) | implemented |
| 9 | PII exposure | None collected: no email, phone, or location is required; profiles are anonymous ids with an optional display name; state is in-memory server-side and localStorage client-side — local-first by design | [`apps/api/src/services/store.ts`](apps/api/src/services/store.ts), privacy pledge on [`apps/web/app/about/`](apps/web/app/about) | implemented |
| 10 | Trusting client-supplied `userId` (impersonation, incl. setting another user's pledge) | Acceptable in the keyless demo tier (no PII at stake, in-memory state); honest limitation covering `/api/actions/log` and `/api/pledge` alike. Roadmap replaces it with Firebase Auth ID-token verification (Bearer) and Firestore owner-only rules | [`tasks.md`](tasks.md) Phase 7 | planned |
| 11 | Gaming the points system (inflated action logs, fabricated restore payloads) | Per-action `maxPerDay` caps enforced in the deterministic core, not the client; unknown ids and non-positive quantities rejected; bootstrap restore clamps claimed points/CO₂ to what the submitted action log actually sums to — one curl cannot mint a leaderboard topper | [`packages/core/src/actions.ts`](packages/core/src/actions.ts), [`apps/api/src/routes/users.ts`](apps/api/src/routes/users.ts) | implemented |
| 12 | Upstream Google API failure / quota exhaustion | Failures map to `502 UPSTREAM_FAILURE` with a safe envelope; demo fallbacks keep the product functional; no retry storms | [`apps/api/src/services/gemini-client.ts`](apps/api/src/services/gemini-client.ts), [`apps/api/src/services/maps-client.ts`](apps/api/src/services/maps-client.ts) | implemented |

## Error envelope (no internals leak)

Every error, every route, the same shape — codes only from a fixed taxonomy
([`packages/core/src/errors.ts`](packages/core/src/errors.ts)); stack traces and upstream
error bodies never reach the client:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "monthlyUnits must be between 30 and 2000" } }
```

`400 VALIDATION_FAILED · 404 NOT_FOUND · 429 RATE_LIMITED · 502 UPSTREAM_FAILURE · 500 INTERNAL`

## Environment contract

[`.env.example`](.env.example) is the schema of record. Rules:

- Real `.env` / `.env.local` files are git-ignored; the example file contains only names,
  comments, and safe defaults.
- `DEMO_MODE=true` (default) means zero outbound calls — the safest posture is the default.
- Server keys (`GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`) never reach the browser; only
  `NEXT_PUBLIC_*` variables are exposed, and those are restrictable by referrer in the
  Google Cloud console (documented inline in the example file).

## Responsible AI

- **Estimates are labelled.** Every calculator output the assistant cites is an
  approximation with documented provenance ([`emission-factors.ts`](packages/core/src/emission-factors.ts));
  the system prompt requires the model to label estimates as estimates.
- **The model never does the math.** Subsidy amounts (PM Surya Ghar ₹30k/₹60k/₹78k bands,
  PM KUSUM 30/30/40 split), payback years, and CO₂ figures are computed by deterministic,
  unit-tested server code and injected as `VERIFIED_CALCULATOR_DATA` — Gemini explains
  them; it cannot alter them.
- **Non-partisan by instruction.** The coach persona is India-focused and scheme-factual;
  it refuses political commentary and off-topic requests, and replies are capped at
  ~180 words to keep answers focused.
- **Official sources only.** Scheme guidance links exclusively to government portals
  ([pmsuryaghar.gov.in](https://pmsuryaghar.gov.in), [mnre.gov.in](https://mnre.gov.in));
  outputs carry "not financial advice" disclaimers on the schemes and about pages.
- **Demo mode is honest.** Deterministic replies are badged `demo` in the UI — never
  presented as live model output.

## Reporting

This is a hackathon project; there is no bug-bounty programme. Issues are welcome via the
repository issue tracker.
