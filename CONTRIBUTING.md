# Contributing

Carbon Saathi is a hackathon project, but it is built to be contributed to. The gates
below are the same ones CI enforces — if they pass locally, your change is reviewable.

## Setup

```bash
npm install        # workspaces: packages/core, apps/api, apps/web
npm run dev        # API on :8080 + web on :3000 (zero keys needed — demo mode)
```

## Before you open a PR

```bash
npm run type-check   # strict TS across core, api, web, tests and e2e
npm run lint         # repo-wide ESLint (zero suppressions policy) + next lint
npm test             # 260+ unit/integration/component tests
npm run format:check # Prettier
npm run e2e          # Playwright journeys + axe accessibility scans (optional locally; CI runs it)
```

## House rules

- **No escape hatches.** `any`, non-null `!`, `@ts-ignore` and `eslint-disable` are not
  used anywhere in source; CI treats them as errors.
- **Errors cross boundaries as values.** Domain code returns `Result<T, AppError>`
  ([packages/core/src/result.ts](packages/core/src/result.ts)) — never throws.
- **One source of truth per number.** Emission factors, scheme bounds and points math
  live in `packages/core` with their provenance; web and API import them.
- **Comments say why, not what.** Every file opens with a short responsibility header.
- **Tests ride along.** Behaviour changes ship with a test in the same PR.

## Reporting security issues

Privately, please — see [SECURITY.md](SECURITY.md).
