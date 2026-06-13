/**
 * Next.js configuration. Owns the dev/prod proxy to the API (so the browser
 * only ever talks same-origin — no CORS in the happy path) and workspace
 * transpilation of the shared core package.
 */
import path from 'node:path';
import type { NextConfig } from 'next';

/**
 * Content-Security-Policy for every HTML response. Next.js App Router streams
 * inline bootstrap scripts (and the theme script in layout.tsx runs inline),
 * so script-src keeps 'unsafe-inline'; everything else is locked to 'self'.
 * connect-src stays 'self' because the browser only ever calls /api/* on this
 * origin (see rewrites below) — the API origin never appears client-side.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // Dev-only: webpack HMR evaluates modules via eval; production never allows it.
  process.env.NODE_ENV === 'development'
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  // Required for Cloud Run: emits a self-contained node server in .next/standalone.
  output: 'standalone',
  // Don't advertise the framework to scanners.
  poweredByHeader: false,
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
  async headers() {
    // Security: helmet hardens only the JSON API — this origin serves the
    // actual HTML/JS to browsers, so it needs its own header posture.
    return [
      {
        source: '/(.*)',
        headers: [
          // No page here ever needs framing — kills clickjacking outright.
          { key: 'X-Frame-Options', value: 'DENY' },
          // Browsers must honor declared MIME types, never sniff.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Cross-origin requests get the origin only — no path leakage.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Cloud Run terminates TLS; a year of HSTS pins browsers to HTTPS.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Every script/style/image/fetch source this app may use, allowlisted.
          { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
          // This app never uses camera, mic, geolocation or payment APIs.
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
