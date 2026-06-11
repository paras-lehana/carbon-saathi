/**
 * Playwright e2e configuration: boots the API (8080, forced DEMO_MODE) and the
 * Next.js web app (3000) together, then runs the specs in ./e2e serially.
 * Owns server lifecycle and reporting; specs own selectors and assertions.
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // The API keeps user/leaderboard state in memory — parallel workers would
  // race on it, so the whole suite runs on a single worker, in file order.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  // Dev-mode servers compile routes on demand; individual waits use 15s, the
  // per-test budget allows several cold compiles in one journey.
  timeout: 90_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run dev:api',
      port: 8080,
      reuseExistingServer: true,
      timeout: 120_000,
      // Deterministic assistant replies: specs assert the 'demo' mode badge
      // and demo answers reuse real calculator outputs (SPEC §4).
      env: { DEMO_MODE: 'true' },
    },
    {
      command: 'npm run dev:web',
      port: 3000,
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
