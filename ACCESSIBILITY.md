# Accessibility

Target: **WCAG 2.1 AA** on every route. Accessibility is engineered into the design tokens
and component contracts, then enforced by an automated axe-core suite — not bolted on.
This document records the decisions, the evidence, and the honest gaps.

## Decisions and evidence

| Decision | Implementation | WCAG criterion |
|---|---|---|
| Skip link as first focusable element | Layout renders "Skip to main content" → `#main` landmark | 2.4.1 Bypass Blocks |
| Semantic landmarks on every page | `header`/`nav`/`main`/`footer`; one `h1` per page, ordered headings | 1.3.1 Info & Relationships |
| Every input labelled | Explicit `<label htmlFor>` (or `aria-label` for icon buttons) across the onboarding wizard, scheme forms, chat input | 3.3.2 Labels or Instructions |
| Visible focus | Global `:focus-visible` ring token (2 px, primary colour, 2 px offset) — never `outline: none` without replacement | 2.4.7 Focus Visible |
| Status messages announced | Toasts and points awards in `aria-live="polite"` regions; chat history is `role="log"` so replies are announced | 4.1.3 Status Messages |
| Full keyboard operability | All interactions are native buttons/inputs/links; wizard and tabs follow roving-focus patterns; no pointer-only targets | 2.1.1 Keyboard |
| Reduced motion honoured twice | CSS `@media (prefers-reduced-motion: reduce)` disables transitions/SMIL; framer-motion components guard with `useReducedMotion()` | 2.3.3 Animation from Interactions |
| Colour never the sole channel | Status conveyed with icon + text label alongside colour (e.g. mode badge "demo"/"gemini", mission progress) | 1.4.1 Use of Color |
| Theme without trap | Light default, dark via `[data-theme='dark']`; toggle is a labelled button, choice persisted; both palettes pass contrast (below) | 1.4.3 / 1.4.11 |
| Touch targets ≥ 44 px | 8 px spacing grid; interactive components sized at ≥ 44×44 px | 2.5.5 (AAA, met where practical) |

Token source: [`apps/web/app/globals.css`](apps/web/app/globals.css). Components:
[`apps/web/components/`](apps/web/components).

## Token contrast (computed, WCAG relative-luminance formula)

| Pair | Hex | Ratio | Verdict |
|---|---|---|---|
| Light text on light bg | `#142a1f` on `#f6faf7` | ≈ 14.4:1 | AAA |
| Light primary on surface | `#177a4c` on `#ffffff` | ≈ 5.3:1 | AA (normal text) |
| Dark text on dark bg | `#ecf4ee` on `#0f1714` | ≈ 16.3:1 | AAA |
| Dark primary on dark surface | `#3ecf8e` on `#16211c` | ≈ 8.3:1 | AAA |
| Error on white | `#c0152f` on `#ffffff` | ≈ 6.2:1 | AA |
| Solar amber accent `#e8a13d` | decorative / large-text only, always paired with a text label in `--text` | n/a by design | — |

The dark background is `#0f1714`, never pure black — reduces halation for astigmatic
users while keeping ≥ 16:1 body contrast.

## Keyboard map

| Context | Keys | Behaviour |
|---|---|---|
| Global | `Tab` / `Shift+Tab` | Through skip link → nav → page content → footer in DOM order |
| Global | `Enter` on skip link | Jumps focus to `#main` |
| Onboarding wizard | `Tab`, `Enter`/`Space` | Field-by-field; Next/Back are real buttons; invalid step blocks advance with an announced inline error |
| Range/stepper inputs | `←`/`→` (and `+`/`−` buttons) | Adjust quantity; value changes announced via associated output |
| Scheme tabs (Surya Ghar / KUSUM) | `←`/`→` between tabs, `Tab` into panel | ARIA tabs pattern |
| Saathi Chat | `Tab` to input, `Enter` to send | New replies announced from the `role="log"` region; suggestion chips are buttons |
| Landing quiz | `Tab` between options, `Enter`/`Space` to pick | Focus moves to each new question's prompt; question changes and the final estimate announced via a polite live region |
| Daily pledge | `Tab` to the labelled select, `Enter` to pledge | Visible `<label>` via the Field primitive; failures announced with `role="alert"`; success toasted |
| Badge wall | `Tab` through badge tiles, `Escape` to dismiss the hint | Each tile is a button; earned/locked state in the accessible name; the unlock hint is linked via `aria-describedby`, shows on focus as well as hover, and dismisses on Escape (WCAG 1.4.13) |
| Chat log | `Tab` to the log, arrow keys to scroll | The conversation region is focusable (`tabIndex=0`) so long histories are keyboard-scrollable |
| Initiatives filters | `Tab` between pills, `Enter`/`Space` to toggle | `aria-pressed` filter buttons; result count announced via a polite live region; "How to start" uses native `<details>` |
| Toasts | none required | `aria-live` polite announcement; auto-dismiss never traps focus |
| Theme toggle | `Enter`/`Space` | State reflected via `aria-pressed` |

A complete keyboard-only journey (landing → onboarding → dashboard → log an action →
ask the assistant) is possible without a pointer; the e2e journey spec exercises the
same flow.

## Automated enforcement

[`e2e/a11y.spec.ts`](e2e/a11y.spec.ts) runs @axe-core/playwright against all 11 routes —
`/`, `/onboarding`, `/dashboard`, `/actions`, `/initiatives`, `/schemes`, `/ev-coach`,
`/assistant`, `/leaderboard`, `/google-services`, `/about` — and fails on any
**serious or critical** violation. The landing page and seeded dashboard are scanned in
**dark theme too**: dark mode re-tints every token, and a light-only scan once missed a
white-on-green button at ~2:1 — text on primary fills now uses the theme-aware
`--on-primary` token (white in light, dark ink in dark, both ≥ 7:1).

Styled lists (`list-none`) carry an explicit `role="list"` so Safari/VoiceOver keep
announcing them as lists; the desktop nav is a real `<ul>`.

```bash
npm run a11y
```

## Honest gaps

- **Automated scans are a floor, not a ceiling.** axe catches roughly a third of WCAG
  issues; manual NVDA/VoiceOver passes were exploratory, not a certified audit.
- **Moderate/minor axe findings are not gated** — only serious/critical fail the suite.
- **Charts** (category donut, progress ring) expose totals via text/`aria-label`
  equivalents, but per-segment exploration is visual-only for now.
- **Hindi locale is planned** ([tasks.md](tasks.md) Phase 10) — language toggle with
  correct `lang` attributes is not yet shipped, which limits reach for the audience the
  KUSUM advisor most serves.
- **No high-contrast (forced-colors) testing yet**; Windows High Contrast Mode behaviour
  is unverified.
