/**
 * Vitest configuration for the API: supertest integration tests on Node.
 * The core alias points at source so the suite runs with zero build steps —
 * `npm test` works on a fresh clone before any package has been compiled.
 */
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@carbon-saathi/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
  },
});
