/**
 * useApiQuery: the load → error → retry lifecycle every fetching route
 * repeats. Two guards keep late responses harmless: a request-id ref drops
 * results a newer request superseded, and the effect-cleanup cancelled flag
 * stops state updates after unmount. Memoise `loader` with useCallback —
 * it is an effect dependency, so a fresh identity per render would refetch.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiResult } from './api-client';

export interface UseApiQueryOptions {
  /** When false nothing is fetched — gate on prerequisites like profile readiness. */
  enabled?: boolean;
}

export interface UseApiQueryResult<T> {
  data: T | null;
  /** User-facing failure message — null while loading and after success. */
  error: string | null;
  loading: boolean;
  /** Re-runs the loader through the same guarded path. */
  retry: () => void;
}

export function useApiQuery<T>(
  loader: () => Promise<ApiResult<T>>,
  options: UseApiQueryOptions = {},
): UseApiQueryResult<T> {
  const enabled = options.enabled ?? true;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  // retry() bumps this so the effect re-runs without duplicating fetch logic.
  const [attempt, setAttempt] = useState(0);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled) return undefined;
    // Unmount guard: cleanup flips this before React drops the component.
    let cancelled = false;
    // Stale-response guard: only the latest request may commit state.
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    setLoading(true);
    setError(null);
    // No catch: the ApiResult contract means the loader resolves, never rejects.
    void loader().then((result) => {
      if (cancelled || requestId !== requestIdRef.current) return;
      if (result.ok) setData(result.data);
      else setError(result.error.message);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, loader, attempt]);

  const retry = useCallback((): void => {
    setAttempt((current) => current + 1);
  }, []);

  return { data, error, loading, retry };
}
