import { defineConfig } from 'vitest/config';

// Runs the forewarning sweeps over three hundred seeds each, apart from the test suite, which
// plays a sample of them: `npm run forewarning`.
export default defineConfig({
  test: {
    include: ['tests/sim/forewarning-*.test.ts'],
    environment: 'node',
    env: { FOREWARNING_SEEDS: 'all' },
    // Stop at the first failure in continuous integration only; report everything locally.
    bail: process.env.CI ? 1 : 0,
  },
});
