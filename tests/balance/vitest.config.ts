import { defineConfig } from 'vitest/config';

// Runs the balance batch apart from the test suite: `npm run balance`.
export default defineConfig({
  test: {
    include: ['tests/balance/run.ts'],
    environment: 'node',
    // A large batch takes minutes, and its table is the point of the run.
    testTimeout: 0,
    disableConsoleIntercept: true,
  },
});
