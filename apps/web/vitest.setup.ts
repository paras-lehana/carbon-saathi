/**
 * Shared test setup: registers jest-dom matchers on Vitest's expect and
 * guarantees DOM cleanup between tests (we run without test globals, so
 * RTL's automatic cleanup hook never fires on its own).
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
