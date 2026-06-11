/**
 * Next.js configuration. Owns the dev/prod proxy to the API (so the browser
 * only ever talks same-origin — no CORS in the happy path) and workspace
 * transpilation of the shared core package.
 */
import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Required for Cloud Run: emits a self-contained node server in .next/standalone.
  output: 'standalone',
  // Pin file tracing to the monorepo root so stray lockfiles outside the
  // repository can never change what gets bundled.
  outputFileTracingRoot: path.join(__dirname, '..', '..'),
  // Efficiency: core ships as TypeScript source inside the workspace; Next
  // compiles it in-place instead of requiring a separate build step.
  transpilePackages: ['@carbon-saathi/core'],
  async rewrites() {
    // Security: the API origin stays server-side; the browser sees only /api/*.
    const apiBase = process.env.API_BASE_URL ?? 'http://localhost:8080';
    return [{ source: '/api/:path*', destination: `${apiBase}/api/:path*` }];
  },
};

export default nextConfig;
