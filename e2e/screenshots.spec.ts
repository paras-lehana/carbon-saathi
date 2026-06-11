/**
 * README evidence capture: full-page screenshots of every key surface (plus
 * dark-mode variants for landing and dashboard) written to e2e/screenshots/.
 * A fixed 1380x900 viewport keeps captures comparable across runs.
 */
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import {
  COLD_START_TIMEOUT_MS,
  askAssistantViaChip,
  getTheme,
  gotoAndWait,
  runSuryaGharCalculation,
  seedViaDebug,
  settleForScreenshot,
  themeToggle,
} from './helpers';

test.use({ viewport: { width: 1380, height: 900 } });

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

async function capture(page: Page, name: string): Promise<void> {
  // Sweep the page first: whileInView entrances use viewport.once, so a single
  // pass reveals every section — otherwise fullPage captures them at opacity 0.
  await page.evaluate(async () => {
    const doc = (globalThis as unknown as { document: { body: { scrollHeight: number } } })
      .document;
    const win = globalThis as unknown as {
      innerHeight: number;
      scrollTo: (x: number, y: number) => void;
    };
    for (let y = 0; y <= doc.body.scrollHeight; y += Math.max(200, win.innerHeight / 2)) {
      win.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    win.scrollTo(0, 0);
  });
  await settleForScreenshot(page);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
}

async function switchToDark(page: Page): Promise<void> {
  await themeToggle(page).click();
  // Fresh contexts start on the light default, so the first toggle must land on dark.
  await expect.poll(() => getTheme(page)).toBe('dark');
}

test('landing', async ({ page }) => {
  await gotoAndWait(page, '/');
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({
    timeout: COLD_START_TIMEOUT_MS,
  });
  await capture(page, 'landing');
});

test('landing dark mode', async ({ page }) => {
  await gotoAndWait(page, '/');
  await switchToDark(page);
  await capture(page, 'landing-dark');
});

test('dashboard seeded', async ({ page }) => {
  await seedViaDebug(page);
  await gotoAndWait(page, '/dashboard');
  await expect(page.getByTestId('dashboard-points')).toBeVisible({
    timeout: COLD_START_TIMEOUT_MS,
  });
  await capture(page, 'dashboard-seeded');
});

test('dashboard seeded dark mode', async ({ page }) => {
  await seedViaDebug(page);
  await gotoAndWait(page, '/dashboard');
  await expect(page.getByTestId('dashboard-points')).toBeVisible({
    timeout: COLD_START_TIMEOUT_MS,
  });
  await switchToDark(page);
  await capture(page, 'dashboard-seeded-dark');
});

test('actions', async ({ page }) => {
  await gotoAndWait(page, '/actions');
  await expect(page.getByRole('heading').first()).toBeVisible({ timeout: COLD_START_TIMEOUT_MS });
  await capture(page, 'actions');
});

test('schemes with surya ghar result', async ({ page }) => {
  await gotoAndWait(page, '/schemes');
  const result = await runSuryaGharCalculation(page, 350);
  await expect(result).toContainText('78,000', { timeout: COLD_START_TIMEOUT_MS });
  await capture(page, 'schemes-result');
});

test('ev coach', async ({ page }) => {
  await gotoAndWait(page, '/ev-coach');
  await expect(page.getByRole('heading').first()).toBeVisible({ timeout: COLD_START_TIMEOUT_MS });
  await capture(page, 'ev-coach');
});

test('assistant with a reply', async ({ page }) => {
  await gotoAndWait(page, '/assistant');
  await askAssistantViaChip(page);
  await capture(page, 'assistant-reply');
});

test('leaderboard with you-row', async ({ page }) => {
  // Seeding first guarantees the highlighted you-row is part of the evidence shot.
  await seedViaDebug(page);
  await gotoAndWait(page, '/leaderboard');
  await expect(page.getByTestId('leaderboard-you')).toBeVisible({
    timeout: COLD_START_TIMEOUT_MS,
  });
  await capture(page, 'leaderboard');
});

test('google services evidence page', async ({ page }) => {
  await gotoAndWait(page, '/google-services');
  await expect(page.getByRole('heading').first()).toBeVisible({ timeout: COLD_START_TIMEOUT_MS });
  await capture(page, 'google-services');
});
