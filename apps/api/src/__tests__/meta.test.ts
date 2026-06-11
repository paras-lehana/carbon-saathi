/**
 * Meta-surface tests: health shape, security headers, error envelopes for
 * unknown routes and malformed bodies, the actions catalog, and the
 * google-services evidence route (which must never leak key material).
 */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { testApp } from './helpers';

describe('GET /api/health', () => {
  it('returns the ok shape with demoMode', async () => {
    const res = await request(testApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBe('0.1.0');
    expect(typeof res.body.uptimeSec).toBe('number');
    expect(res.body.demoMode).toBe(true);
  });

  it('hides x-powered-by and sets a restrictive CSP', async () => {
    const res = await request(testApp()).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
  });
});

describe('error envelopes', () => {
  it('returns the NOT_FOUND envelope for unknown routes', async () => {
    const res = await request(testApp()).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(typeof res.body.error.message).toBe('string');
  });

  it('maps malformed JSON bodies to a 400 VALIDATION_FAILED envelope', async () => {
    const res = await request(testApp())
      .post('/api/footprint/baseline')
      .set('content-type', 'application/json')
      .send('{not json');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});

describe('GET /api/actions/catalog', () => {
  it('serves all 12 actions with the points contract intact', async () => {
    const res = await request(testApp()).get('/api/actions/catalog');
    expect(res.status).toBe(200);
    expect(res.body.actions).toHaveLength(12);
    for (const action of res.body.actions) {
      expect(action.pointsPerUnit).toBe(Math.round(action.co2SavedKg * 10));
    }
  });
});

describe('GET /api/google/services', () => {
  it('lists at least 10 services with the expected status summary', async () => {
    const res = await request(testApp()).get('/api/google/services');
    expect(res.status).toBe(200);
    expect(res.body.services.length).toBeGreaterThanOrEqual(10);
    expect(res.body.summary).toEqual({
      implemented: 3,
      readyWithKey: 3,
      planned: 4,
      total: 10,
    });
  });

  it('never serialises secret values', async () => {
    const res = await request(testApp()).get('/api/google/services');
    const serialized = JSON.stringify(res.body);
    // Google API keys start with AIza — their absence proves the catalog
    // carries env var names only.
    expect(serialized).not.toContain('AIza');
    expect(serialized).not.toContain('BEGIN PRIVATE KEY');
  });
});
