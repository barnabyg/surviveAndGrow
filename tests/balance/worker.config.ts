import { defineConfig } from 'vitest/config';

// One worker of the balance run, started by `run.ts` with its share of the games.
export default defineConfig({
  test: {
    include: ['tests/balance/worker.ts'],
    environment: 'node',
    testTimeout: 0,
  },
});
