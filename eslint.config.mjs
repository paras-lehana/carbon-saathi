// Repo-wide ESLint (flat config): typescript-eslint for the node packages
// (core, api), the e2e suite and scripts. The web app keeps Next.js's own
// ESLint setup (apps/web/.eslintrc.json via `next lint`) — excluded here so
// the two configs never fight over the same files.
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      'apps/web/**', // linted by next lint (eslint-config-next)
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['packages/core/src/**/*.ts', 'apps/api/src/**/*.ts', 'e2e/**/*.ts', 'playwright.config.ts'],
    rules: {
      // House rules the codebase already follows — encoded so drift fails CI.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'no-console': 'error', // the API logs via structured sinks, never console
      // Allow _ prefix for intentionally-unused destructured bindings (TS convention).
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Build/maintenance scripts run under plain Node: console IS their output.
    files: ['scripts/**/*.cjs'],
    languageOptions: { globals: { require: 'readonly', module: 'readonly', process: 'readonly', console: 'readonly', __dirname: 'readonly' } },
    rules: { 'no-console': 'off', '@typescript-eslint/no-require-imports': 'off' },
  },
  // Prettier last: silences every formatting rule so the two tools never disagree.
  prettier,
);
