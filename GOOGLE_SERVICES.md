# Google Services

Carbon Saathi integrates twelve Google products across a graceful-degradation ladder:
**`implemented`** (live in production, tested) → **`ready-with-key`** (code shipped; set one
env var to go live) → **`planned`** (seam in code, roadmap phase in [tasks.md](tasks.md)).

> **Live right now**: both services run on Cloud Run in asia-south1 (Mumbai) —
> web [carbon-saathi-web-ktdjm6xcyq-el.a.run.app](https://carbon-saathi-web-ktdjm6xcyq-el.a.run.app),
> API [carbon-saathi-api-ktdjm6xcyq-el.a.run.app/api/health](https://carbon-saathi-api-ktdjm6xcyq-el.a.run.app/api/health)
> (`demoMode: false` = live Gemini). Built by Cloud Build into Artifact Registry; the
> Gemini key mounts from Secret Manager.

This document mirrors the typed catalog at
[`packages/core/src/google/service-catalog.ts`](packages/core/src/google/service-catalog.ts),
which the API serves at `GET /api/google/services` and the web app renders at
`/google-services` — the repo self-reports its integrations, and an integration test
asserts that route never leaks an env var _value_.

## Service contract

| Product                           | Purpose / user value                                                                                                                             | Status           | Env vars                                                               | Fallback without key                                                                                                   | Code paths                                                                                                                                                                                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gemini API** (Google AI Studio) | Saathi Chat — a grounded climate coach that explains the user's own calculator numbers (subsidies, payback, CO₂)                                 | `implemented`    | `GEMINI_API_KEY`, `GEMINI_MODEL`                                       | `DEMO_MODE` returns deterministic replies built from the _same_ calculator outputs — demo answers contain real numbers | [`apps/api/src/services/gemini-client.ts`](apps/api/src/services/gemini-client.ts), [`apps/api/src/services/assistant.ts`](apps/api/src/services/assistant.ts), [`apps/api/src/services/prompt-boundary.ts`](apps/api/src/services/prompt-boundary.ts), [`apps/web/app/assistant/`](apps/web/app/assistant) |
| **Maps Distance Matrix API**      | Real origin→destination distances for the commute emission comparison                                                                            | `ready-with-key` | `GOOGLE_MAPS_API_KEY`                                                  | Deterministic distance estimate, honestly labelled `source: "estimate"` in the response and UI                         | [`apps/api/src/services/maps-client.ts`](apps/api/src/services/maps-client.ts), [`apps/api/src/routes/commute.ts`](apps/api/src/routes/commute.ts)                                                                                                                                                          |
| **Maps JavaScript API**           | Interactive route map for the EV-coach commute comparison                                                                                        | `ready-with-key` | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`                                      | Static mode-comparison renders without the map                                                                         | [`apps/web/app/ev-coach/components/CommuteCompare.tsx`](apps/web/app/ev-coach/components/CommuteCompare.tsx)                                                                                                                                                                                                |
| **Cloud Run**                     | Both services **live** in asia-south1 (Mumbai — lowest latency for Indian users): stateless containers, scale-to-zero, SIGTERM-graceful shutdown | `implemented`    | `PORT`                                                                 | Runs as a plain Node process on any host                                                                               | [`apps/api/Dockerfile`](apps/api/Dockerfile), [`apps/web/Dockerfile`](apps/web/Dockerfile), [`cloudbuild-api.yaml`](cloudbuild-api.yaml), [`cloudbuild-web.yaml`](cloudbuild-web.yaml)                                                                                                                      |
| **Cloud Build**                   | Server-side build → push → deploy pipeline on every release; no local Docker needed                                                              | `implemented`    | —                                                                      | Local `docker build` with the same Dockerfiles                                                                         | [`cloudbuild-api.yaml`](cloudbuild-api.yaml), [`cloudbuild-web.yaml`](cloudbuild-web.yaml), [`scripts/deploy.ps1`](scripts/deploy.ps1)                                                                                                                                                                      |
| **Artifact Registry**             | Versioned container images per build, co-located with the runtime region                                                                         | `implemented`    | —                                                                      | Any OCI registry (image names are substitution-driven)                                                                 | [`cloudbuild-api.yaml`](cloudbuild-api.yaml), [`scripts/deploy.ps1`](scripts/deploy.ps1)                                                                                                                                                                                                                    |
| **Cloud Logging**                 | The live API streams structured JSON logs (route, status, latencyMs — never raw user text); build logs land there too                            | `implemented`    | —                                                                      | Plain stdout JSON lines locally                                                                                        | [`apps/api/src/middleware/logger.ts`](apps/api/src/middleware/logger.ts)                                                                                                                                                                                                                                    |
| **Secret Manager**                | The Gemini key mounts onto the Cloud Run service by reference — never in images, the repo, or plain env-var config                               | `implemented`    | `GEMINI_API_KEY`                                                       | Git-ignored `.env` files locally                                                                                       | [`scripts/deploy.ps1`](scripts/deploy.ps1), [`apps/api/src/config.ts`](apps/api/src/config.ts)                                                                                                                                                                                                              |
| **Google Analytics 4**            | Anonymous usage analytics to learn which climate features help most                                                                              | `ready-with-key` | `NEXT_PUBLIC_GA4_MEASUREMENT_ID`                                       | Analytics disabled — zero tracking by default                                                                          | [`apps/web/app/layout.tsx`](apps/web/app/layout.tsx)                                                                                                                                                                                                                                                        |
| **Firebase Authentication**       | Optional sign-in to sync progress across devices                                                                                                 | `planned`        | `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`     | Anonymous local profiles — no PII required or collected                                                                | [`apps/api/src/services/store.ts`](apps/api/src/services/store.ts)                                                                                                                                                                                                                                          |
| **Cloud Firestore**               | Durable persistence for profiles, action logs, streaks                                                                                           | `planned`        | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | `InMemoryUserStore` behind the same `UserStore` interface (sessions reset on restart)                                  | [`apps/api/src/services/store.ts`](apps/api/src/services/store.ts)                                                                                                                                                                                                                                          |
| **Firebase Hosting**              | Global CDN edge for the web app                                                                                                                  | `planned`        | —                                                                      | Cloud Run serves the web app today; any static host works                                                              | [`apps/web/next.config.ts`](apps/web/next.config.ts)                                                                                                                                                                                                                                                        |

Summary by status (also computed live by `getServiceSummary()`): **6 implemented ·
3 ready-with-key · 3 planned**.

## How to activate live mode

Everything works with zero keys (`DEMO_MODE=true` is the default posture). To go live:

### 1. Gemini (Saathi Chat)

1. Create an API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Copy [`.env.example`](.env.example) to `.env` in the repo root (the API reads it):

   ```bash
   GEMINI_API_KEY=your-key
   GEMINI_MODEL=gemini-2.5-flash   # 2.0-flash returns 429 on new AI Studio keys
   DEMO_MODE=false
   ```

3. Restart `npm run dev`. The chat badge flips from `demo` to `gemini`;
   `GET /api/health` reports `demoMode: false`.
4. Remove the key and the assistant degrades back to deterministic demo replies —
   no crash, no blank page. The grounding pipeline (calculators →
   `VERIFIED_CALCULATOR_DATA` → boundary-wrapped user input) is identical in both modes.

### 2. Maps Distance Matrix (commute compare)

1. Enable _Distance Matrix API_ in a Google Cloud project; create a **server** key and
   restrict it by IP.
2. Set `GOOGLE_MAPS_API_KEY=…` in `.env`, restart.
3. `POST /api/commute/compare` with `origin`/`destination` strings now returns
   `source: "maps"`; without the key (or with only `distanceKm`), it returns
   `source: "estimate"`.

### 3. Maps JavaScript API (interactive map)

Create a **browser** key restricted by HTTP referrer, set
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=…` in `apps/web/.env.local`. The EV-coach commute
comparison lazy-loads the map only when the key exists — no key, no script request.

### 4. Google Analytics 4

Set `NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXX` in `apps/web/.env.local`. The snippet loads
only when configured — tracking is opt-in by deployment, zero by default.

### 5. Cloud Run deploy (live — reproduce it in one command)

```powershell
.\scripts\deploy.ps1 -ProjectId <your-gcp-project>
```

The script enables the required APIs, creates the Artifact Registry repo, runs both
Cloud Build pipelines, stores the Gemini key in **Secret Manager** (mounted onto the
service by reference with least-privilege accessor IAM), and wires the web origin into
the API's CORS allowlist. Region defaults to asia-south1.

### 6. Firebase (roadmap)

Phase 7 in [tasks.md](tasks.md): `FirestoreUserStore implements UserStore` (drop-in
behind the existing interface) and Firebase Auth ID-token verification replacing the
demo-tier trusted `userId`.

## Design principle

Every integration follows the same contract, enforced by the catalog type
(`GoogleServiceIntegration`): a user-value statement, explicit env var **names**, a
deterministic fallback, and evidence signals an evaluator can check. If a Google service
is down, unkeyed, or over quota, Carbon Saathi stays fully usable — the demo path is the
same code, not a separate stub app.
