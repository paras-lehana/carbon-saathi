// One-off local axe probe (not part of the project; delete after use).
const { chromium } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  for (const route of ['/', '/actions']) {
    await page.goto('http://localhost:3000' + route);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    console.log('######## ROUTE ' + route);
    for (const v of results.violations.filter((v) => ['serious', 'critical'].includes(v.impact))) {
      console.log('=== ' + v.id + ' (' + v.impact + ')');
      for (const n of v.nodes) {
        console.log('TARGET:', JSON.stringify(n.target));
        console.log('HTML:', n.html.slice(0, 300));
        console.log('FIX:', (n.failureSummary || '').slice(0, 300));
      }
    }
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
