/**
 * Baseline + user lifecycle tests: exact survey math through the HTTP layer,
 * bootstrap create/restore semantics, and the full log-action → dashboard
 * journey including the daily anti-gaming cap.
 */
import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { METRO_COMMUTER_SURVEY, testApp } from './helpers';

describe('POST /api/footprint/baseline', () => {
  it('computes the metro-commuter household exactly', async () => {
    const res = await request(testApp())
      .post('/api/footprint/baseline')
      .send(METRO_COMMUTER_SURVEY);
    expect(res.status).toBe(200);
    const baseline = res.body.baseline;
    // (250×12×0.716 + 1×12×42.3) / 3 = 885.2 → 885
    expect(baseline.byCategory.homeEnergy).toBe(885);
    // metro 0.015×12×2×5×48 = 86.4 plus 2 short flights ×1100×0.121 = 266.2 → 353
    expect(baseline.byCategory.transport).toBe(353);
    expect(baseline.byCategory.food).toBe(550);
    expect(baseline.byCategory.shopping).toBe(600);
    expect(baseline.totalKgAnnual).toBe(2388);
    expect(baseline.vsIndiaAverage).toBe(1.19);
    expect(baseline.topDriver).toBe('homeEnergy');
    expect(baseline.generatedTips).toHaveLength(3);
  });

  it('rejects an invalid survey with 400 VALIDATION_FAILED', async () => {
    const res = await request(testApp())
      .post('/api/footprint/baseline')
      .send({ ...METRO_COMMUTER_SURVEY, householdSize: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});

describe('users, actions and dashboard', () => {
  let app: Express;

  beforeEach(() => {
    app = testApp();
  });

  it('bootstraps a fresh user with empty gamification state', async () => {
    const res = await request(app).post('/api/users/bootstrap').send({ displayName: 'Asha' });
    expect(res.status).toBe(200);
    expect(typeof res.body.userId).toBe('string');
    expect(res.body.displayName).toBe('Asha');
    expect(res.body.gamification.points).toBe(0);
    expect(res.body.gamification.streak.current).toBe(0);
    expect(res.body.gamification.earnedBadges).toEqual([]);
    expect(res.body.gamification.pledge).toBeNull();
  });

  it('awards quiz-whiz and pehla-kadam when bootstrap arrives from the quiz', async () => {
    const baseline = await request(app).post('/api/footprint/baseline').send(METRO_COMMUTER_SURVEY);
    const res = await request(app).post('/api/users/bootstrap').send({
      displayName: 'Quizzer',
      baseline: baseline.body.baseline,
      survey: METRO_COMMUTER_SURVEY,
      source: 'quiz',
    });
    expect(res.status).toBe(200);
    expect(res.body.gamification.earnedBadges).toEqual(['quiz-whiz', 'pehla-kadam']);
    expect(res.body.joinedVia).toBe('quiz');
    // The survey persists so the assistant can ground on its numbers.
    expect(res.body.survey.monthlyElectricityKwh).toBe(250);
  });

  it('awards only pehla-kadam for the survey path', async () => {
    const baseline = await request(app).post('/api/footprint/baseline').send(METRO_COMMUTER_SURVEY);
    const res = await request(app).post('/api/users/bootstrap').send({
      baseline: baseline.body.baseline,
      source: 'survey',
    });
    expect(res.body.gamification.earnedBadges).toEqual(['pehla-kadam']);
  });

  it('clamps restore payloads to what the submitted ledger supports', async () => {
    // One curl must not mint a leaderboard topper: 999,999 claimed points
    // against an 8-point ledger collapses to 8.
    const res = await request(app)
      .post('/api/users/bootstrap')
      .send({
        displayName: 'Minter',
        gamification: {
          points: 999_999,
          totalCo2SavedKg: 50_000,
          streak: { current: 1, longest: 1, shields: 0, lastLogDateISO: '2026-06-10' },
          actionLog: [
            {
              actionId: 'veg-day',
              quantity: 1,
              co2SavedKg: 0.8,
              points: 8,
              loggedAtISO: '2026-06-10T08:00:00.000Z',
            },
          ],
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.gamification.points).toBe(8);
    expect(res.body.gamification.totalCo2SavedKg).toBe(0.8);
  });

  it('restores an existing user instead of recreating it', async () => {
    const first = await request(app).post('/api/users/bootstrap').send({ displayName: 'Asha' });
    const again = await request(app)
      .post('/api/users/bootstrap')
      .send({ userId: first.body.userId, displayName: 'Different Name' });
    expect(again.status).toBe(200);
    // The server copy is the ledger of record — the original name survives.
    expect(again.body.displayName).toBe('Asha');
    expect(again.body.userId).toBe(first.body.userId);
  });

  it('logs an action and reflects points on the dashboard', async () => {
    const user = await request(app).post('/api/users/bootstrap').send({ displayName: 'Asha' });
    const log = await request(app)
      .post('/api/actions/log')
      .send({ userId: user.body.userId, actionId: 'metro-instead-of-car', quantity: 2 });
    expect(log.status).toBe(200);
    // 1.55 kg × 2 = 3.1 kg; pointsPerUnit round(15.5)=16 → 32 points
    expect(log.body.impact.co2SavedKg).toBe(3.1);
    expect(log.body.impact.points).toBe(32);
    expect(log.body.gamification.streak.current).toBe(1);
    expect(log.body.todayLog).toHaveLength(1);

    // First log earns pehli-jeet — full definition rides on the response.
    expect(log.body.newBadges.map((badge: { id: string }) => badge.id)).toEqual(['pehli-jeet']);
    expect(log.body.gamification.earnedBadges).toEqual(['pehli-jeet']);

    const dash = await request(app).get(`/api/dashboard/${user.body.userId}`);
    expect(dash.status).toBe(200);
    expect(dash.body.gamification.points).toBe(32);
    expect(dash.body.gamification.level.name).toBe('Seed');
    expect(dash.body.gamification.earnedBadges).toEqual(['pehli-jeet']);
    expect(dash.body.gamification.pledge).toBeNull();
    expect(dash.body.missions).toHaveLength(3);
    const carFree = dash.body.missions.find(
      (m: { missionId: string }) => m.missionId === 'car-free-commute-x3',
    );
    expect(carFree.progress).toBe(2);
    expect(dash.body.suggestions).toHaveLength(3);
    expect(dash.body.recentActions).toHaveLength(1);
    // 3.1 kg ÷ 0.17 kg/km petrol-car factor ≈ 18 km not driven
    expect(dash.body.analogies.kmNotDriven).toBe(18);
  });

  it('enforces the cumulative daily cap across requests', async () => {
    const user = await request(app).post('/api/users/bootstrap').send({});
    const userId = user.body.userId;
    const first = await request(app)
      .post('/api/actions/log')
      .send({ userId, actionId: 'wfh-day', quantity: 1 });
    expect(first.status).toBe(200);
    const second = await request(app)
      .post('/api/actions/log')
      .send({ userId, actionId: 'wfh-day', quantity: 1 });
    expect(second.status).toBe(400);
    expect(second.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('rejects an unknown actionId with 400', async () => {
    const user = await request(app).post('/api/users/bootstrap').send({});
    const res = await request(app)
      .post('/api/actions/log')
      .send({ userId: user.body.userId, actionId: 'teleport-to-work', quantity: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('rejects logging for an unknown user with 404', async () => {
    const res = await request(app)
      .post('/api/actions/log')
      .send({ userId: 'ghost-user', actionId: 'veg-day', quantity: 1 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for a dashboard of an unknown user', async () => {
    const res = await request(app).get('/api/dashboard/ghost-user');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
