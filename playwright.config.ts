import { defineConfig } from '@playwright/test';

// Set E2E_PORT to run from several worktrees at once without the servers colliding.
const port = Number(process.env.E2E_PORT ?? 4173);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  // Seam 2: the running app in a browser, at the size the game is designed for.
  testDir: 'tests/e2e',
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
