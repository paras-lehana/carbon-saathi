/**
 * Cross-cutting middleware through the full app: the PII-free logging
 * contract (route patterns only — never bodies, queries or user ids) and
 * deterministic token-bucket refill via the injected clock.
 */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { testApp } from './helpers';

/** Mid-day IST (12:00) — the canonical frozen instant for these suites. */
const FROZEN_NOW_MS = Date.parse('2026-06-12T06:30:00.000Z');

interface LogLine {
  severity: string;
  time: string;
  method: string;
  route: string;
  status: number;
  latencyMs: number;
}

describe('request logger', () => {
  it('logs route pattern, status and latency — never bodies or user ids', async () => {
    const lines: string[] = [];
    const app = testApp({}, { logSink: (line) => lines.push(line), now: () => FROZEN_NOW_MS });

    const created = await request(app)
      .post('/api/users/bootstrap')
      .send({ displayName: 'SECRET_SENTINEL_9' });
    expect(created.status).toBe(200);
    const missing = await request(app).get('/api/dashboard/SECRET_SENTINEL_9');
    expect(missing.status).toBe(404);

    // The sentinel travelled in a body and in a URL — neither may reach the sink.
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(line).not.toContain('SECRET_SENTINEL_9');
    }

    const [bootstrapLine, dashboardLine] = lines.map((line) => JSON.parse(line) as LogLine);
    expect(bootstrapLine.route).toBe('/api/users/bootstrap');
    expect(bootstrapLine.method).toBe('POST');
    expect(bootstrapLine.status).toBe(200);
    expect(bootstrapLine.severity).toBe('INFO');
    // Frozen clock: start and finish read the same instant.
    expect(bootstrapLine.latencyMs).toBe(0);

    // The matched pattern is logged in place of the concrete user-id URL.
    expect(dashboardLine.route).toBe('/api/dashboard/:userId');
    expect(dashboardLine.status).toBe(404);
    expect(dashboardLine.severity).toBe('WARNING');
  });
});

describe('rate limiting', () => {
  it('admits capacity requests, 429s the overflow, and refills after one window', async () => {
    let clock = FROZEN_NOW_MS;
    const app = testApp({ rateLimitMax: 2, rateLimitWindowMs: 1_000 }, { now: () => clock });

    expect((await request(app).get('/api/health')).status).toBe(200);
    expect((await request(app).get('/api/health')).status).toBe(200);

    const limited = await request(app).get('/api/health');
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');

    // One full window refills the bucket back to capacity.
    clock += 1_000;
    expect((await request(app).get('/api/health')).status).toBe(200);
  });

  it('refills continuously — half a window buys exactly one token, not a burst', async () => {
    let clock = FROZEN_NOW_MS;
    const app = testApp({ rateLimitMax: 2, rateLimitWindowMs: 1_000 }, { now: () => clock });

    await request(app).get('/api/health');
    await request(app).get('/api/health'); // bucket drained

    // 500 ms × (2 tokens / 1000 ms) = exactly 1 token.
    clock += 500;
    expect((await request(app).get('/api/health')).status).toBe(200);
    expect((await request(app).get('/api/health')).status).toBe(429);
  });
});
