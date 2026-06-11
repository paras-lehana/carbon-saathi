/**
 * Vitest configuration for web component/lib tests: jsdom environment with
 * React Testing Library. Aliases the core workspace package to its TS source
 * so tests run without a prior core build.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': rootDir,
      // Efficiency: resolve straight to TS source — no dist build required.
      '@carbon-saathi/core': path.resolve(rootDir, '../../packages/core/src/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['components/__tests__/**/*.test.{ts,tsx}', 'lib/__tests__/**/*.test.{ts,tsx}'],
    css: false,
  },
});
