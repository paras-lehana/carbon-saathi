/**
 * Pledge lifecycle: creation and replacement semantics, error envelopes, and
 * the full payoff integration — pledge → log the pledged action → 1.2× bonus
 * applied exactly once with pledge-keeper awarded.
 */
import { applyPledgeBonus } from '@carbon-saathi/core';
import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { testApp } from './helpers';

async function bootstrapUser(app: Express): Promise<string> {
  const res = await request(app).post('/api/users/bootstrap').send({ displayName: 'Asha' });
  return res.body.userId as string;
}

describe('POST /api/pledge', () => {
  let app: Express;

  beforeEach(() => {
    app = testApp();
  });

  it('records a pledge for today with bonus pending', async () => {
    const userId = await bootstrapUser(app);
    const res = await request(app).post('/api/pledge').send({ userId, actionId: 'veg-day' });
    expect(res.status).toBe(200);
    expect(res.body.pledge.actionId).toBe('veg-day');
    expect(res.body.pledge.bonusApplied).toBe(false);
    expect(res.body.pledge.dateISO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns 404 NOT_FOUND for an unknown user', async () => {
    const res = await request(app)
      .post('/api/pledge')
      .send({ userId: 'ghost-user', actionId: 'veg-day' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 VALIDATION_FAILED for an unknown actionId, without reflecting it', async () => {
    const userId = await bootstrapUser(app);
    const res = await request(app)
      .post('/api/pledge')
      .send({ userId, actionId: 'teleport-to-work' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    // No-reflection contract: attacker-controlled ids never echo back.
    expect(res.body.error.message).toBe('Unknown actionId.');
  });

  it('replaces the pledge on re-pledge and shows it on the dashboard', async () => {
    const userId = await bootstrapUser(app);
    await request(app).post('/api/pledge').send({ userId, actionId: 'veg-day' });
    await request(app).post('/api/pledge').send({ userId, actionId: 'wfh-day' });
    const dash = await request(app).get(`/api/dashboard/${userId}`);
    expect(dash.status).toBe(200);
    expect(dash.body.gamification.pledge.actionId).toBe('wfh-day');
    expect(dash.body.gamification.pledge.bonusApplied).toBe(false);
  });

  it('pays the 1.2× bonus exactly once when the pledged action is logged', async () => {
    const userId = await bootstrapUser(app);
    await request(app).post('/api/pledge').send({ userId, actionId: 'veg-day' });

    const log = await request(app)
      .post('/api/actions/log')
      .send({ userId, actionId: 'veg-day', quantity: 1 });
    expect(log.status).toBe(200);
    // veg-day: 0.8 kg → 8 base points; bonus round(8 × 1.2) = 10.
    expect(log.body.impact.points).toBe(applyPledgeBonus(8));
    expect(log.body.gamification.points).toBe(10);
    expect(log.body.gamification.pledge.bonusApplied).toBe(true);
    // Completing the pledge awards pledge-keeper alongside the first-action badge.
    const newIds = log.body.newBadges.map((badge: { id: string }) => badge.id);
    expect(newIds).toContain('pledge-keeper');
    expect(newIds).toContain('pehli-jeet');
  });

  it('pays base points for non-pledged actions', async () => {
    const userId = await bootstrapUser(app);
    await request(app).post('/api/pledge').send({ userId, actionId: 'veg-day' });
    const log = await request(app)
      .post('/api/actions/log')
      .send({ userId, actionId: 'metro-instead-of-car', quantity: 2 });
    expect(log.status).toBe(200);
    // metro-instead-of-car: 16 points/unit × 2 — no bonus, pledge untouched.
    expect(log.body.impact.points).toBe(32);
    expect(log.body.gamification.pledge.bonusApplied).toBe(false);
  });
});
