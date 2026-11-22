import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // Ports away from Vite's defaults (5173, 4173), so the game does not clash with other apps.
  // strictPort stops with an error rather than quietly moving to another port.
  server: { port: 41730, strictPort: true },
  preview: { port: 41731, strictPort: true },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          // React in a chunk of its own keeps each chunk under the 500 kB warning, and lets the
          // browser keep React cached when only the game changes.
          groups: [{ name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ }],
        },
      },
    },
  },
  test: {
    // Seam 1: the simulation interface, and the interface's own logic over it. Test files run in
    // parallel workers.
    include: ['tests/sim/**/*.test.ts', 'tests/ui/**/*.test.ts'],
    environment: 'node',
    // Stop at the first failure in continuous integration only; report everything locally.
    bail: process.env.CI ? 1 : 0,
  },
});
