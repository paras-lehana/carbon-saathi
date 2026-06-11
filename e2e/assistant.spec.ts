/**
 * Saathi assistant chat: a suggestion chip yields a grounded numeric reply with
 * the demo-mode badge, and a typed follow-up question yields a second reply.
 */
import { expect, test } from '@playwright/test';
import { askAssistantViaChip, gotoAndWait } from './helpers';

test('chip reply carries numbers and demo badge, typed question gets a second reply', async ({
  page,
}) => {
  await gotoAndWait(page, '/assistant');

  const log = await askAssistantViaChip(page);
  // Grounding contract (SPEC §4): demo replies reuse real calculator outputs,
  // so a concrete number must appear in the reply bubble.
  await expect(log).toContainText(/\d/, { timeout: 10_000 });

  await page
    .getByTestId('assistant-input')
    .fill('How much could a 3 kW rooftop solar system save me each year?');
  await page.getByTestId('assistant-send').click();
  await expect(log).toContainText(/rooftop solar/i, { timeout: 10_000 });
  // Each assistant reply carries its own mode badge — two badges = two replies.
  await expect
    .poll(() => log.getByText(/\bdemo\b/i).count(), { timeout: 10_000 })
    .toBeGreaterThanOrEqual(2);
});
