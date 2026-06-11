/**
 * Leaderboard tests: deterministic seed ranking, live-user merge with the
 * isYou flag, and level names derived from core thresholds.
 */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { testApp } from './helpers';

describe('GET /api/leaderboard', () => {
  it('serves the 12 seeds ranked by points with no userRank for strangers', async () => {
    const res = await request(testApp()).get('/api/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(12);
    expect(res.body.userRank).toBeNull();
    const points = res.body.entries.map((entry: { points: number }) => entry.points);
    expect(points).toEqual([...points].sort((a: number, b: number) => b - a));
    expect(res.body.entries[0].rank).toBe(1);
    expect(res.body.entries[0].name).toBe('Aarav Mehta');
  });

  it('merges a live user and marks their row with isYou and userRank', async () => {
    const app = testApp();
    const user = await request(app).post('/api/users/bootstrap').send({ displayName: 'Paras' });
    const userId = user.body.userId;
    // 4 metro logs × 16 points = 64 points — lands below every seed.
    await request(app)
      .post('/api/actions/log')
      .send({ userId, actionId: 'metro-instead-of-car', quantity: 4 });

    const res = await request(app).get(`/api/leaderboard?userId=${userId}`);
    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(13);
    const you = res.body.entries.find((entry: { isYou?: boolean }) => entry.isYou === true);
    expect(you.name).toBe('Paras');
    expect(you.points).toBe(64);
    expect(res.body.userRank).toBe(you.rank);
    expect(you.rank).toBe(13);
  });

  it('labels every entry with a core level name', async () => {
    const res = await request(testApp()).get('/api/leaderboard');
    const validLevels = new Set(['Seed', 'Sapling', 'Tree', 'Grove', 'Forest']);
    for (const entry of res.body.entries) {
      expect(validLevels.has(entry.level)).toBe(true);
    }
    expect(res.body.entries[0].level).toBe('Forest'); // 12,840 points
  });
});
