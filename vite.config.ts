import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    // Seam 1: the simulation interface. Test files run in parallel workers.
    include: ['tests/sim/**/*.test.ts'],
    environment: 'node',
    // Stop at the first failure in continuous integration only; report everything locally.
    bail: process.env.CI ? 1 : 0,
  },
});
