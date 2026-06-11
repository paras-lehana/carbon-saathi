/**
 * Quiz estimate endpoint: exact numbers through the HTTP layer (the route
 * must reproduce core's calculator output bit-for-bit), validation-failure
 * envelopes, and determinism across identical requests.
 */
import type { QuizAnswers } from '@carbon-saathi/core';
import { estimateFromQuiz } from '@carbon-saathi/core';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { testApp } from './helpers';

const METRO_ANSWERS: QuizAnswers = {
  commute: 'metro-bus',
  ac: 'rarely',
  diet: 'veg',
  flights: 'none',
  shopping: 'minimal',
};

describe('POST /api/quiz/estimate', () => {
  it('returns the baseline and the mapped survey for valid answers', async () => {
    const res = await request(testApp())
      .post('/api/quiz/estimate')
      .send({ answers: METRO_ANSWERS });
    expect(res.status).toBe(200);
    // The route must serve exactly what core computes — no re-wrapping.
    const direct = estimateFromQuiz(METRO_ANSWERS);
    expect(direct.ok).toBe(true);
    if (direct.ok) {
      expect(res.body.baseline).toEqual(direct.value.baseline);
      expect(res.body.survey).toEqual(direct.value.survey);
    }
    expect(res.body.survey.commuteMode).toBe('metro');
    expect(res.body.baseline.totalKgAnnual).toBeGreaterThan(0);
  });

  it('rejects a missing answer with 400 VALIDATION_FAILED', async () => {
    const { shopping: _omitted, ...partial } = METRO_ANSWERS;
    const res = await request(testApp()).post('/api/quiz/estimate').send({ answers: partial });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('rejects an unknown option id with 400 VALIDATION_FAILED', async () => {
    const res = await request(testApp())
      .post('/api/quiz/estimate')
      .send({ answers: { ...METRO_ANSWERS, commute: 'rocket' } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('is deterministic: identical answers produce identical bodies', async () => {
    const app = testApp();
    const first = await request(app).post('/api/quiz/estimate').send({ answers: METRO_ANSWERS });
    const second = await request(app).post('/api/quiz/estimate').send({ answers: METRO_ANSWERS });
    expect(first.body).toEqual(second.body);
  });

  it('orders profiles sensibly: car-heavy answers beat the greenest set', async () => {
    const app = testApp();
    const green = await request(app).post('/api/quiz/estimate').send({ answers: METRO_ANSWERS });
    const heavy = await request(app)
      .post('/api/quiz/estimate')
      .send({
        answers: {
          commute: 'car',
          ac: 'all-night',
          diet: 'nonveg-daily',
          flights: 'three-plus',
          shopping: 'love-shopping',
        },
      });
    expect(green.body.baseline.totalKgAnnual).toBeLessThan(heavy.body.baseline.totalKgAnnual);
  });
});
