/**
 * Vitest configuration for the core domain engine: pure unit tests on Node,
 * no DOM and no network. Test files live in src/__tests__ and are excluded
 * from the compiled build output (see tsconfig.json).
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
  },
});
