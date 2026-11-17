import { defineConfig } from 'vitest/config';

// Runs the one script that writes a kept save, apart from the test suite: `npm run save:fixture`.
export default defineConfig({
  test: {
    include: ['tests/saves/write-fixture.ts'],
    environment: 'node',
  },
});
