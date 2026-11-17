import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // Ports away from Vite's defaults (5173, 4173), so the game does not clash with other apps.
  // strictPort stops with an error rather than quietly moving to another port.
  server: { port: 41730, strictPort: true },
  preview: { port: 41731, strictPort: true },
  test: {
    // Seam 1: the simulation interface. Test files run in parallel workers.
    include: ['tests/sim/**/*.test.ts'],
    environment: 'node',
    // Stop at the first failure in continuous integration only; report everything locally.
    bail: process.env.CI ? 1 : 0,
  },
});
