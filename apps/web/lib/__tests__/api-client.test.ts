/**
 * api-client: the never-throws contract — network failures, API error
 * envelopes and malformed bodies (including 2xx payloads that fail their
 * core response schema) must all normalise to { ok:false, error }.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateBaselineFootprint, baselineSurveySchema } from '@carbon-saathi/core';
import { calculateSuryaGhar, getHealth, logAction, quizEstimate, setPledge } from '../api-client';

afterEach(() => {
  vi.unstubAllGlobals();
});

// Derive the fixture values from core so they can never drift from what the
// real API returns — the same pattern as QuizWidget.test.tsx.
const FIXTURE_SURVEY = baselineSurveySchema.parse({
  householdSize: 4,
  monthlyElectricityKwh: 250,
  lpgCylindersPerMonth: 1,
  commuteMode: 'metro',
  commuteKmOneWay: 10,
  commuteDaysPerWeek: 5,
  flightsShortPerYear: 0,
  flightsLongPerYear: 0,
  dietPattern: 'vegetarian',
  shoppingLevel: 'medium',
  acHoursPerDay: 4,
});

const FIXTURE_BASELINE = (() => {
  const result = calculateBaselineFootprint(FIXTURE_SURVEY);
  if (!result.ok) throw new Error('fixture survey must produce a valid baseline');
  return result.value;
})();

describe('api-client', () => {
  it('maps a network failure to an UPSTREAM_FAILURE envelope instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const result = await getHealth();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UPSTREAM_FAILURE');
      expect(result.error.message.length).toBeGreaterThan(0);
    }
  });

  it('passes the API error envelope through verbatim', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: 'VALIDATION_FAILED', message: 'monthlyUnits too low' },
          }),
          { status: 400, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    const result = await calculateSuryaGhar({ monthlyUnits: 1 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({ code: 'VALIDATION_FAILED', message: 'monthlyUnits too low' });
    }
  });

  it('falls back to a status-derived code when the error body is malformed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>nope</html>', { status: 404 })),
    );

    const result = await getHealth();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('returns ok with typed data and sends JSON content-type on POST', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          impact: { co2SavedKg: 1.55, points: 16 },
          gamification: {
            points: 16,
            totalCo2SavedKg: 1.55,
            streak: { current: 1, longest: 1, shields: 0, lastLogDateISO: '2026-01-05' },
            earnedBadges: [],
            pledge: null,
            level: { name: 'Seed', icon: '🌱', minPoints: 0, nextLevelAt: 100, progressPct: 16 },
          },
          todayLog: [],
          newBadges: [],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await logAction({ userId: 'u1', actionId: 'metro-instead-of-car', quantity: 1 });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.impact.points).toBe(16);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/actions/log');
    expect(new Headers(init.headers).get('content-type')).toBe('application/json');
  });

  it('quizEstimate posts the answers and unwraps the typed payload', async () => {
    const answers = {
      commute: 'metro-bus',
      ac: 'rarely',
      diet: 'veg',
      flights: 'none',
      shopping: 'minimal',
    } as const;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ baseline: FIXTURE_BASELINE, survey: FIXTURE_SURVEY }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await quizEstimate(answers);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.baseline.totalKgAnnual).toBe(FIXTURE_BASELINE.totalKgAnnual);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/quiz/estimate');
    expect(JSON.parse(String(init.body))).toEqual({ answers });
  });

  it('maps a 2xx payload that fails its response schema to UPSTREAM_FAILURE', async () => {
    // Truncated baseline + survey: would previously have been blind-cast.
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ baseline: { totalKgAnnual: 1500 }, survey: { householdSize: 4 } }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        ),
    );

    const result = await quizEstimate({
      commute: 'metro-bus',
      ac: 'rarely',
      diet: 'veg',
      flights: 'none',
      shopping: 'minimal',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UPSTREAM_FAILURE');
      expect(result.error.message).toBe('Malformed response from server.');
    }
  });

  it('setPledge posts userId + actionId and surfaces validation errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: { code: 'VALIDATION_FAILED', message: 'Unknown actionId.' } }),
          {
            status: 400,
            headers: { 'content-type': 'application/json' },
          },
        ),
      ),
    );

    const result = await setPledge({ userId: 'u1', actionId: 'bogus' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION_FAILED');
  });
});
