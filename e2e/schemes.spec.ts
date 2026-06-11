/**
 * Scheme calculators through the UI: PM Surya Ghar subsidy/payback for a
 * 350-unit household, and PM-KUSUM Component B routing for a diesel-pump
 * farmer with the central/state/farmer subsidy split visible.
 */
import { expect, test } from '@playwright/test';
import {
  COLD_START_TIMEOUT_MS,
  completeRadioGroups,
  fillNumberField,
  firstVisible,
  gotoAndWait,
  runSuryaGharCalculation,
  selectChoice,
} from './helpers';

test('surya ghar: 350 monthly units → ₹78,000 subsidy and payback shown', async ({ page }) => {
  await gotoAndWait(page, '/schemes');
  // 350 units sizes a 3 kW system, which lands on the capped central subsidy band (SPEC §3.4).
  const result = await runSuryaGharCalculation(page, 350);
  await expect(result).toContainText('78,000', { timeout: COLD_START_TIMEOUT_MS });
  await expect(result).toContainText(/payback/i);
  await expect(result).toContainText(/\d+(\.\d+)?\s*(year|yr)/i);
});

test('kusum: diesel pump farmer → Component B with subsidy split', async ({ page }) => {
  await gotoAndWait(page, '/schemes');
  const kusumTab = await firstVisible(page.getByRole('tab', { name: /kusum/i }));
  if (kusumTab) {
    await kusumTab.click();
  } else {
    // Tabs may be rendered as plain toggle buttons — same activation intent.
    const fallback = await firstVisible(
      page.locator('main').getByRole('button', { name: /kusum/i }),
    );
    if (fallback) await fallback.click();
  }

  await selectChoice(page, /individual/i);
  await selectChoice(page, /diesel/i);
  // "Pump size (HP)" is the numeric field; a looser /pump/i would also match
  // the "Current irrigation pump" select, which cannot be .fill()ed.
  await fillNumberField(page, /pump size|\bhp\b/i, '5');
  // Any remaining required radio group (e.g. barren-land yes/no) gets a default.
  await completeRadioGroups(page);

  const submit = await firstVisible(
    page
      .locator('main')
      .getByRole('button', { name: /advise|recommend|check|calculate|find|get/i }),
  );
  if (!submit) throw new Error('KUSUM submit button not found');
  await submit.click();

  // The KUSUM panel exposes its own testid so a Surya Ghar result rendered in
  // the sibling tab can never satisfy this assertion by mistake.
  const result = page.getByTestId('kusum-result');
  await expect(result).toBeVisible({ timeout: COLD_START_TIMEOUT_MS });
  // Diesel/none pumps route to Component B: 30% central + 30% state + 40% farmer (SPEC §3.5).
  await expect(result).toContainText(/component\s*b/i, { timeout: COLD_START_TIMEOUT_MS });
  await expect(result).toContainText(/central/i);
  await expect(result).toContainText(/state/i);
  await expect(result).toContainText(/farmer/i);
});
