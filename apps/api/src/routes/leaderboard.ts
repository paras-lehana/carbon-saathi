/**
 * Leaderboard endpoint: merges the deterministic seed entries with live users
 * from the store and ranks by points. Only display names and points leave the
 * server — never logs, baselines or ids of other users.
 */
import { levelForPoints } from '@carbon-saathi/core';
import { Router } from 'express';
import { LEADERBOARD_SEED } from '../data/leaderboard-seed';
import { asyncHandler } from '../middleware/validate';
import type { UserStore } from '../services/store';

// Bounds the payload if the in-memory store fills up with demo users.
const MAX_ENTRIES = 50;

interface LeaderboardRow {
  readonly userId: string;
  readonly name: string;
  readonly points: number;
}

interface LeaderboardEntry {
  readonly rank: number;
  readonly name: string;
  readonly points: number;
  readonly level: string;
  /** Present (true) only on the requesting user's row — undefined keys are dropped by res.json. */
  readonly isYou?: boolean;
}

export function createLeaderboardRouter(store: UserStore): Router {
  const router = Router();
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const requesterId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
      // Efficiency: a full list + sort is O(n log n) per request, acceptable
      // for the in-memory store's ≤10k bound. This is the first endpoint to
      // revisit (top-K selection or cached aggregate) when Firestore lands.
      const liveUsers = await store.listUsers();
      const seedIds = new Set(LEADERBOARD_SEED.map((entry) => entry.userId));
      const rows: LeaderboardRow[] = [
        ...LEADERBOARD_SEED,
        ...liveUsers
          .filter((user) => !seedIds.has(user.userId))
          .map((user) => ({
            userId: user.userId,
            name: user.displayName,
            points: user.gamification.points,
          })),
      ];
      // Points descending; name as tie-breaker keeps equal scores stable
      // across requests instead of flickering in the UI.
      rows.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

      const ranked: LeaderboardEntry[] = rows.map((row, index) => ({
        rank: index + 1,
        name: row.name,
        points: row.points,
        level: levelForPoints(row.points).name,
        isYou: row.userId === requesterId ? true : undefined,
      }));
      const yourEntry =
        requesterId === undefined ? undefined : ranked.find((entry) => entry.isYou === true);
      // Top slice plus the requester's own row, so "you" stays visible even
      // when ranked below the cut.
      const entries = ranked.slice(0, MAX_ENTRIES);
      if (yourEntry !== undefined && !entries.includes(yourEntry)) entries.push(yourEntry);

      res.json({ entries, userRank: yourEntry?.rank ?? null });
    }),
  );
  return router;
}
