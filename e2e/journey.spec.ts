/**
 * End-to-end user journeys: the full five-step onboarding survey through to a
 * populated dashboard, then the seeded fast path (window.__saathi) where a
 * quick action raises the points total and fires an aria-live toast.
 */
import { expect, test, type Page } from '@playwright/test';
import {
  COLD_START_TIMEOUT_MS,
  completeRadioGroups,
  fieldName,
  gotoAndWait,
  readPoints,
  seedViaDebug,
  setRangeValue,
} from './helpers';

// An annual figure rendered with units, e.g. "1,842 kg" — matches the baseline
// reveal as well as the dashboard total, so it survives the redirect race.
const KG_PATTERN = /\d[\d,]*(\.\d+)?\s*kg/i;

// Keyword → realistic Indian-household answers (SPEC §3.2 survey fields).
// Order matters: specific patterns (bill, AC) must win before generic ones (unit, day).
const NUMERIC_FIELD_VALUES: ReadonlyArray<{ pattern: RegExp; value: number }> = [
  { pattern: /household|family|people|member/i, value: 4 },
  { pattern: /bill/i, value: 2100 }, // ≈300 kWh at the ₹7/unit derivation
  { pattern: /kwh|electric|unit/i, value: 250 },
  { pattern: /cylinder|lpg/i, value: 1 },
  { pattern: /carpool/i, value: 1 },
  { pattern: /\bac\b|air[\s-]?con|cooling/i, value: 4 },
  { pattern: /short/i, value: 2 }, // short-haul flights per year
  { pattern: /long/i, value: 0 },
  { pattern: /km|distance|one[\s-]?way/i, value: 12 },
  { pattern: /day/i, value: 5 }, // commute days per week
];

// Plausible low-carbon survey choices for selects and radio groups.
const CHOICE_PREFERENCES: ReadonlyArray<RegExp> = [/metro/i, /vegetarian/i, /medium/i];

// Toasts are aria-live per the a11y contract; the points card is itself a live
// region, so it is excluded to avoid a false toast match.
const TOAST_SELECTOR = [
  '[role="status"]',
  '[role="alert"]',
  '[aria-live="polite"]',
  '[aria-live="assertive"]',
]
  .map((selector) => `${selector}:not([data-testid="dashboard-points"])`)
  .join(', ');

function realisticValueFor(name: string): number | undefined {
  return NUMERIC_FIELD_VALUES.find((entry) => entry.pattern.test(name))?.value;
}

/** Joined control names of the visible step — changes whenever the wizard advances. */
async function stepSignature(page: Page): Promise<string> {
  const controls = page.locator('input:visible, select:visible');
  const count = await controls.count();
  const names: string[] = [];
  for (let i = 0; i < count; i++) names.push(await fieldName(controls.nth(i)));
  return names.join('|');
}

async function fillVisibleStepFields(page: Page): Promise<void> {
  const numberInputs = page.locator(
    'input[type="number"]:visible, input[inputmode="numeric"]:visible, input[inputmode="decimal"]:visible',
  );
  const numberCount = await numberInputs.count();
  for (let i = 0; i < numberCount; i++) {
    const input = numberInputs.nth(i);
    await input.fill(String(realisticValueFor(await fieldName(input)) ?? 2));
  }

  // Controlled range inputs only react to native-setter + dispatched input events.
  const sliders = page.locator('input[type="range"]:visible');
  const sliderCount = await sliders.count();
  for (let i = 0; i < sliderCount; i++) {
    const slider = sliders.nth(i);
    const min = Number((await slider.getAttribute('min')) ?? '0');
    const max = Number((await slider.getAttribute('max')) ?? '100');
    const target = realisticValueFor(await fieldName(slider)) ?? Math.round((min + max) / 2);
    await setRangeValue(slider, Math.min(Math.max(target, min), max));
  }

  const selects = page.locator('select:visible');
  const selectCount = await selects.count();
  for (let i = 0; i < selectCount; i++) {
    const select = selects.nth(i);
    const labels = await select.locator('option').allInnerTexts();
    const preferred = labels.findIndex((label) =>
      CHOICE_PREFERENCES.some((pattern) => pattern.test(label)),
    );
    if (preferred >= 0) {
      await select.selectOption({ index: preferred });
    } else if (labels.length > 1 && (await select.inputValue()) === '') {
      // Skip a leading placeholder option but never undo an existing default.
      await select.selectOption({ index: 1 });
    }
  }

  for (const preference of CHOICE_PREFERENCES) {
    const radio = page.getByRole('radio', { name: preference }).first();
    if ((await radio.count()) > 0 && (await radio.isVisible())) await radio.check();
  }
  await completeRadioGroups(page);

  const textInputs = page.locator('input[type="text"]:visible');
  const textCount = await textInputs.count();
  for (let i = 0; i < textCount; i++) {
    const input = textInputs.nth(i);
    const name = await fieldName(input);
    if (/name/i.test(name)) await input.fill('Asha');
    else if (/state|city/i.test(name)) await input.fill('Karnataka');
  }
}

test('onboarding wizard: five steps → baseline reveal → dashboard totals', async ({ page }) => {
  await gotoAndWait(page, '/onboarding');
  const next = page.getByTestId('onboarding-next');
  const submit = page.getByTestId('onboarding-submit');
  await expect(next.or(submit).first()).toBeVisible({ timeout: COLD_START_TIMEOUT_MS });

  // 5 survey steps + review; the cap guards against a validation dead-loop.
  let signature = await stepSignature(page);
  for (let step = 0; step < 7; step++) {
    if (await submit.isVisible()) break;
    await fillVisibleStepFields(page);
    const previous = signature;
    await next.click();
    // Advance is confirmed by the control set changing (or the review step appearing);
    // a timeout here means a field failed validation and the wizard refused to move.
    await expect
      .poll(
        async () => {
          signature = await stepSignature(page);
          return (await submit.isVisible()) || signature !== previous;
        },
        { timeout: COLD_START_TIMEOUT_MS },
      )
      .toBe(true);
  }

  await expect(submit).toBeVisible({ timeout: COLD_START_TIMEOUT_MS });
  await submit.click();

  // Baseline reveal: the computed annual total appears before/with the redirect.
  await expect(page.getByText(KG_PATTERN).first()).toBeVisible({ timeout: COLD_START_TIMEOUT_MS });
  if (!/\/dashboard/.test(page.url())) {
    // Some reveal designs require an explicit continue — click it when offered.
    const cta = page
      .getByRole('link', { name: /dashboard/i })
      .or(page.getByRole('button', { name: /dashboard/i }))
      .first();
    const ctaVisible = await cta
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (ctaVisible) await cta.click();
  }
  await page.waitForURL('**/dashboard', { timeout: COLD_START_TIMEOUT_MS });
  await expect(page.getByTestId('dashboard-points')).toContainText(/\d/, {
    timeout: COLD_START_TIMEOUT_MS,
  });
  await expect(page.getByText(KG_PATTERN).first()).toBeVisible({ timeout: COLD_START_TIMEOUT_MS });
});

test('landing quiz: five answers → estimate → dashboard with the badge earned', async ({
  page,
}) => {
  await gotoAndWait(page, '/');
  const quizSection = page.locator('#quiz');
  await expect(quizSection.getByRole('progressbar', { name: 'Quiz progress' })).toBeVisible({
    timeout: COLD_START_TIMEOUT_MS,
  });

  // Answer all five questions by picking the first option each time — the
  // option group re-renders per question, so re-query on every step.
  for (let step = 0; step < 5; step++) {
    const option = quizSection.locator('[role="group"] button').first();
    await expect(option).toBeVisible({ timeout: COLD_START_TIMEOUT_MS });
    await option.click();
  }

  // Result screen: the tonnes estimate is the quiz's whole payoff.
  await expect(quizSection.getByText(/\d+(\.\d+)?\s*t\s*CO/)).toBeVisible({
    timeout: COLD_START_TIMEOUT_MS,
  });

  await quizSection.getByRole('button', { name: /see my full dashboard/i }).click();
  await page.waitForURL('**/dashboard', { timeout: COLD_START_TIMEOUT_MS });
  await expect(page.getByTestId('dashboard-points')).toBeVisible({
    timeout: COLD_START_TIMEOUT_MS,
  });
  // The quiz bootstrap awards quiz-whiz AND pehla-kadam server-side.
  await expect(page.getByRole('button', { name: 'Quiz Whiz (earned)' })).toBeVisible({
    timeout: COLD_START_TIMEOUT_MS,
  });
});

test('initiatives hub: category filter narrows and restores the grid', async ({ page }) => {
  await gotoAndWait(page, '/initiatives');
  const allPill = page.getByRole('button', { name: /^All \(\d+\)$/ });
  await expect(allPill).toBeVisible({ timeout: COLD_START_TIMEOUT_MS });
  const totalCards = await page.getByRole('article').count();
  expect(totalCards).toBeGreaterThanOrEqual(20);

  await page.getByRole('button', { name: /Mobility/ }).click();
  await expect.poll(() => page.getByRole('article').count()).toBeLessThan(totalCards);

  await allPill.click();
  await expect.poll(() => page.getByRole('article').count()).toBe(totalCards);
});

test('seeded fast path: quick action raises points and fires a toast', async ({ page }) => {
  // Each test gets a fresh browser context, so no onboarding state leaks in here.
  await seedViaDebug(page);
  await gotoAndWait(page, '/dashboard');
  await expect(page.getByTestId('dashboard-points')).toContainText(/\d/, {
    timeout: COLD_START_TIMEOUT_MS,
  });
  await expect(page.getByText(KG_PATTERN).first()).toBeVisible({ timeout: COLD_START_TIMEOUT_MS });

  // Settle initial fetches/count-up so the "before" read is the real resting value.
  await page.waitForLoadState('networkidle');
  const before = await readPoints(page);

  const quickAction = page.locator('[data-testid^="action-log-"]:visible').first();
  await expect(quickAction).toBeVisible({ timeout: COLD_START_TIMEOUT_MS });
  await quickAction.click();

  const toast = page
    .locator(TOAST_SELECTOR)
    .filter({ hasText: /point|logged|saved|added|kg|\+\d/i })
    .first();
  await expect(toast).toBeVisible({ timeout: 10_000 });
  await expect.poll(() => readPoints(page), { timeout: 10_000 }).toBeGreaterThan(before);
});
