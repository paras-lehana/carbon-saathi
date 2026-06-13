/**
 * useApiQuery: the data/error lifecycle plus the two response guards — a
 * stale response must never clobber a newer one (request-id ref), and a
 * response landing after unmount must not update state (cancelled flag).
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiResult } from '../api-client';
import { useApiQuery } from '../use-api-query';

interface Deferred {
  promise: Promise<ApiResult<string>>;
  resolve: (result: ApiResult<string>) => void;
}

/** A promise resolvable from the test body — lets us order responses. */
function createDeferred(): Deferred {
  let resolve: (result: ApiResult<string>) => void = () => undefined;
  const promise = new Promise<ApiResult<string>>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function okResult(data: string): ApiResult<string> {
  return { ok: true, data };
}

function failResult(message: string): ApiResult<string> {
  return { ok: false, error: { code: 'INTERNAL', message } };
}

describe('useApiQuery', () => {
  it('loads data and clears the loading flag', async () => {
    const loader = vi.fn(async (): Promise<ApiResult<string>> => okResult('hello'));
    const { result } = renderHook(() => useApiQuery(loader));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toBe('hello'));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('exposes the error message and recovers via retry()', async () => {
    const loader = vi
      .fn<() => Promise<ApiResult<string>>>()
      .mockResolvedValueOnce(failResult('Server down.'))
      .mockResolvedValueOnce(okResult('recovered'));
    const { result } = renderHook(() => useApiQuery(loader));
    await waitFor(() => expect(result.current.error).toBe('Server down.'));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.data).toBe('recovered'));
    expect(result.current.error).toBeNull();
  });

  it('does not fetch while disabled, then fetches once enabled', async () => {
    const loader = vi.fn(async (): Promise<ApiResult<string>> => okResult('gated'));
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useApiQuery(loader, { enabled }),
      { initialProps: { enabled: false } },
    );
    expect(loader).not.toHaveBeenCalled();
    rerender({ enabled: true });
    await waitFor(() => expect(result.current.data).toBe('gated'));
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('ignores a stale response that resolves after a newer request', async () => {
    const first = createDeferred();
    const second = createDeferred();
    const loader = vi
      .fn<() => Promise<ApiResult<string>>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useApiQuery(loader));
    // Supersede the in-flight first request before it resolves.
    act(() => result.current.retry());
    await act(async () => {
      second.resolve(okResult('fresh'));
      await second.promise;
    });
    expect(result.current.data).toBe('fresh');
    await act(async () => {
      first.resolve(okResult('stale'));
      await first.promise;
    });
    expect(result.current.data).toBe('fresh');
  });

  it('skips state updates for responses that land after unmount', async () => {
    const pending = createDeferred();
    const loader = vi.fn<() => Promise<ApiResult<string>>>().mockReturnValue(pending.promise);
    const { result, unmount } = renderHook(() => useApiQuery(loader));
    expect(result.current.loading).toBe(true);
    unmount();
    await act(async () => {
      pending.resolve(okResult('late'));
      await pending.promise;
    });
    // The hook never re-rendered — its last snapshot still has no data.
    expect(result.current.data).toBeNull();
  });
});
