/**
 * In-memory per-IP token bucket. Owns admission decisions only — callers
 * choose capacity/window per route group. The clock is injectable so tests
 * can drive refill behaviour deterministically.
 */
import { appError } from '@carbon-saathi/core';
import type { RequestHandler } from 'express';
import { sendError } from './validate';

export interface RateLimiterOptions {
  /** Maximum burst size — also the steady-state requests allowed per window. */
  readonly capacity: number;
  /** Time for an empty bucket to refill completely. */
  readonly windowMs: number;
  /** Injectable clock (ms since epoch) — defaults to Date.now outside tests. */
  readonly now?: () => number;
}

interface Bucket {
  tokens: number;
  lastRefillMs: number;
}

// Security: an attacker rotating spoofed IPs could otherwise grow the bucket
// map without bound — prune idle buckets once the map gets large.
const PRUNE_THRESHOLD = 10_000;

export function createRateLimiter(options: RateLimiterOptions): RequestHandler {
  const now = options.now ?? Date.now;
  const refillPerMs = options.capacity / options.windowMs;
  const buckets = new Map<string, Bucket>();

  return (req, res, next) => {
    const key = req.ip ?? 'unknown';
    const timestamp = now();

    if (buckets.size > PRUNE_THRESHOLD) {
      for (const [ip, bucket] of buckets) {
        // Idle for two windows means the bucket is full again — safe to drop.
        if (timestamp - bucket.lastRefillMs > options.windowMs * 2) buckets.delete(ip);
      }
    }

    let bucket = buckets.get(key);
    if (bucket === undefined) {
      bucket = { tokens: options.capacity, lastRefillMs: timestamp };
      buckets.set(key, bucket);
    } else {
      // Continuous refill instead of fixed windows: avoids the burst-at-reset
      // problem where a client gets 2× capacity around a window boundary.
      bucket.tokens = Math.min(
        options.capacity,
        bucket.tokens + (timestamp - bucket.lastRefillMs) * refillPerMs,
      );
      bucket.lastRefillMs = timestamp;
    }

    if (bucket.tokens < 1) {
      sendError(res, appError('RATE_LIMITED'));
      return;
    }
    bucket.tokens -= 1;
    next();
  };
}
