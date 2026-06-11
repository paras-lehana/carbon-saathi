/**
 * Smoke coverage: the landing page renders, every primary route is reachable
 * with a visible heading, landing stays free of unexpected console errors, and
 * the theme toggle flips data-theme and persists it across a reload.
 */
import { expect, test } from '@playwright/test';
import {
  COLD_START_TIMEOUT_MS,
  collectConsoleErrors,
  getTheme,
  gotoAndWait,
  themeToggle,
} from './helpers';

const ROUTES: ReadonlyArray<string> = [
  '/dashboard',
  '/actions',
  '/schemes',
  '/ev-coach',
  '/assistant',
  '/leaderboard',
  '/google-services',
  '/about',
];

test('landing renders the hero heading', async ({ page }) => {
  await gotoAndWait(page, '/');
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({
    timeout: COLD_START_TIMEOUT_MS,
  });
});

for (const route of ROUTES) {
  test(`${route} is reachable with a visible heading`, async ({ page }) => {
    await gotoAndWait(page, '/');
    // Prefer real nav-link navigation; fall back to direct goto for routes
    // that only appear in the footer or behind a condensed menu.
    const navLink = page.locator(`header a[href="${route}"], nav a[href="${route}"]`).first();
    if ((await navLink.count()) > 0 && (await navLink.isVisible())) {
      await navLink.click();
      await page.waitForURL(`**${route}`, { timeout: COLD_START_TIMEOUT_MS });
    } else {
      await gotoAndWait(page, route);
    }
    await expect(page.getByRole('heading').first()).toBeVisible({
      timeout: COLD_START_TIMEOUT_MS,
    });
  });
}

test('landing emits no unexpected console errors', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await gotoAndWait(page, '/');
  // Let deferred hydration and fetch work surface their logs before asserting.
  await page.waitForLoadState('networkidle');
  expect(errors).toEqual([]);
});

test('theme toggle flips data-theme and persists across reload', async ({ page }) => {
  await gotoAndWait(page, '/');
  // The light default may render without an explicit attribute — null is valid here.
  const initial = await getTheme(page);
  await themeToggle(page).click();
  await expect.poll(() => getTheme(page)).not.toBe(initial);
  const flipped = await getTheme(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  // Persistence contract: the stored choice is re-applied on boot (SPEC §5).
  await expect.poll(() => getTheme(page), { timeout: COLD_START_TIMEOUT_MS }).toBe(flipped);
});
