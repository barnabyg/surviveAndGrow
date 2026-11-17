import { defineConfig } from '@playwright/test';

// Set E2E_PORT to run from several worktrees at once without the servers colliding.
const port = Number(process.env.E2E_PORT ?? 41731);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  // Seam 2: the running app in a browser, at the size the game is designed for.
  testDir: 'tests/e2e',
  // The game saves to the browser's storage. Playwright gives every test a browser context
  // of its own, with empty storage, so tests running in parallel never see each other's
  // saves and no test starts with a saved game it did not make. Keep it that way: do not
  // share a context or a storage state between tests.
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // Stop at the first failure in continuous integration only; report everything locally.
  maxFailures: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL,
    viewport: { width: 2560, height: 1440 },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    // Serves the production build, so `npm run build` must run first (test:e2e does this).
    command: `npm run preview -- --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
  },
});
