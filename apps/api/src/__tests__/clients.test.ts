/**
 * Upstream clients through their injected fetchFn seams — no network, no
 * live keys. Pins the security contracts: keyless modes never fetch, error
 * messages carry the HTTP status only (upstream bodies are never relayed),
 * and the Gemini key travels in a header rather than the URL.
 */
import { describe, expect, it, vi } from 'vitest';
import { createGeminiClient } from '../services/gemini-client';
import { resolveDistanceKm } from '../services/maps-client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('gemini-client', () => {
  const MODEL = 'gemini-2.0-flash';

  it('joins candidate parts into the trimmed reply text on the happy path', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        candidates: [
          { content: { parts: [{ text: 'Switch to LED bulbs' }, { text: ' this month. ' }] } },
        ],
      }),
    );
    const client = createGeminiClient({ apiKey: 'test-key-123', model: MODEL, fetchFn });

    expect(client.enabled).toBe(true);
    const result = await client.generate('You are a coach.', 'How do I cut my bill?');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('Switch to LED bulbs this month.');

    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    );
    // Security contract: the key rides in a header, never in the URL.
    expect(url).not.toContain('test-key-123');
    expect(new Headers(init.headers).get('x-goog-api-key')).toBe('test-key-123');
  });

  it('maps a non-200 to UPSTREAM_FAILURE with a status-only message', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(new Response('stack trace with internals', { status: 503 }));
    const client = createGeminiClient({ apiKey: 'k', model: MODEL, fetchFn });

    const result = await client.generate('sys', 'user');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UPSTREAM_FAILURE');
      // The upstream body is never relayed — the status alone is the message.
      expect(result.error.message).toBe('Gemini responded with HTTP 503.');
    }
  });

  it('treats an empty candidate list as an upstream failure', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ candidates: [] }));
    const client = createGeminiClient({ apiKey: 'k', model: MODEL, fetchFn });

    const result = await client.generate('sys', 'user');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toBe('Gemini returned an empty reply.');
  });

  it('swallows transport errors into a fixed, key-free message', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('ECONNREFUSED https://…?key=leaky'));
    const client = createGeminiClient({ apiKey: 'k', model: MODEL, fetchFn });

    const result = await client.generate('sys', 'user');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UPSTREAM_FAILURE');
      expect(result.error.message).toBe('Gemini request failed or timed out.');
    }
  });

  it('keyless (demo) mode reports disabled and never invokes fetch', async () => {
    const fetchFn = vi.fn();
    const client = createGeminiClient({ apiKey: undefined, model: MODEL, fetchFn });

    expect(client.enabled).toBe(false);
    const result = await client.generate('sys', 'user');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UPSTREAM_FAILURE');
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('maps-client resolveDistanceKm', () => {
  it('keyless mode answers a deterministic estimate without fetching', async () => {
    const fetchFn = vi.fn();
    const first = await resolveDistanceKm({
      apiKey: undefined,
      origin: 'Connaught Place',
      destination: 'Gurugram',
      fetchFn,
    });

    expect(first.source).toBe('estimate');
    // Fallback band: 5 + (hash % 21) — always a plausible 5–25 km commute.
    expect(first.distanceKm).toBeGreaterThanOrEqual(5);
    expect(first.distanceKm).toBeLessThanOrEqual(25);
    expect(fetchFn).not.toHaveBeenCalled();

    // Same strings, same answer — repeated demo queries must not jitter.
    const second = await resolveDistanceKm({
      apiKey: undefined,
      origin: 'Connaught Place',
      destination: 'Gurugram',
      fetchFn,
    });
    expect(second.distanceKm).toBe(first.distanceKm);
  });

  it('parses Distance Matrix metres into km on the happy path', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        status: 'OK',
        rows: [{ elements: [{ status: 'OK', distance: { value: 12_340 } }] }],
      }),
    );

    const result = await resolveDistanceKm({
      apiKey: 'maps-key',
      origin: 'Connaught Place',
      destination: 'Gurugram',
      fetchFn,
    });

    // 12,340 m ÷ 1000 = 12.34 km → 12.3 after one-decimal rounding.
    expect(result).toEqual({ distanceKm: 12.3, source: 'maps' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('falls back to the estimate when Maps answers a non-OK status', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ status: 'REQUEST_DENIED', rows: [] }));

    const result = await resolveDistanceKm({
      apiKey: 'maps-key',
      origin: 'A',
      destination: 'B',
      fetchFn,
    });

    expect(result.source).toBe('estimate');
  });

  it('passes a client-supplied distance through labelled as an estimate', async () => {
    const fetchFn = vi.fn();
    const result = await resolveDistanceKm({ apiKey: 'maps-key', distanceKm: 7.5, fetchFn });

    expect(result).toEqual({ distanceKm: 7.5, source: 'estimate' });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
