/**
 * Automated WCAG 2.1 A/AA scans (axe-core) across every route. The dashboard
 * is scanned in its seeded state so real content — not the empty state — is
 * audited. Serious/critical violations fail; details are attached for triage.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { getTheme, gotoAndWait, seedViaDebug, themeToggle } from './helpers';

const ROUTES: ReadonlyArray<string> = [
  '/',
  '/onboarding',
  '/dashboard',
  '/actions',
  '/initiatives',
  '/schemes',
  '/ev-coach',
  '/assistant',
  '/leaderboard',
  '/google-services',
  '/about',
];

// Dark theme re-tints every token — colors that pass in light mode can fail
// in dark (white-on-bright-green once shipped at ~2:1). Scan the two most
// visited surfaces in dark as well.
const DARK_ROUTES: ReadonlyArray<string> = ['/', '/dashboard'];

for (const route of DARK_ROUTES) {
  test(`no serious or critical axe violations on ${route} (dark theme)`, async ({
    page,
  }, testInfo) => {
    if (route === '/dashboard') await seedViaDebug(page);
    await gotoAndWait(page, route);
    await themeToggle(page).click();
    await expect.poll(() => getTheme(page)).toBe('dark');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );
    if (blocking.length > 0) {
      await testInfo.attach(`axe-dark${route === '/' ? '-landing' : route.replace(/\//g, '-')}`, {
        body: JSON.stringify(blocking, null, 2),
        contentType: 'application/json',
      });
    }
    expect(
      blocking.map(
        (violation) => `${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`,
      ),
    ).toEqual([]);
  });
}

for (const route of ROUTES) {
  test(`no serious or critical axe violations on ${route}`, async ({ page }, testInfo) => {
    // An anonymous dashboard renders only the empty state; seed for real content.
    if (route === '/dashboard') await seedViaDebug(page);
    await gotoAndWait(page, route);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );

    if (blocking.length > 0) {
      // Node-level details land in the HTML report so failures are debuggable
      // without re-running the scan locally.
      await testInfo.attach(`axe${route === '/' ? '-landing' : route.replace(/\//g, '-')}`, {
        body: JSON.stringify(blocking, null, 2),
        contentType: 'application/json',
      });
    }
    expect(
      blocking.map(
        (violation) => `${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`,
      ),
    ).toEqual([]);
  });
}
