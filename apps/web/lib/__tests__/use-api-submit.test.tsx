/**
 * useApiSubmit: pending must wrap the call, failures must surface through the
 * toast live region, and the resolved result flows back to the caller either
 * way.
 */
import type { ReactNode } from 'react';
import { act, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/ui/Toast';
import type { ApiResult } from '../api-client';
import { useApiSubmit } from '../use-api-submit';

function wrapper({ children }: { children: ReactNode }): React.JSX.Element {
  return <ToastProvider>{children}</ToastProvider>;
}

describe('useApiSubmit', () => {
  it('returns the success result without toasting', async () => {
    const submitFn = vi.fn(
      async (input: number): Promise<ApiResult<string>> => ({ ok: true, data: `got ${input}` }),
    );
    const { result } = renderHook(() => useApiSubmit(submitFn), { wrapper });
    let outcome: ApiResult<string> | null = null;
    await act(async () => {
      outcome = await result.current.submit(7);
    });
    expect(outcome).toEqual({ ok: true, data: 'got 7' });
    expect(result.current.pending).toBe(false);
    expect(screen.getByRole('region', { name: 'Notifications' })).toBeEmptyDOMElement();
  });

  it('toasts the error message on failure and clears pending', async () => {
    const submitFn = vi.fn(
      async (): Promise<ApiResult<string>> => ({
        ok: false,
        error: { code: 'VALIDATION_FAILED', message: 'Units out of range.' },
      }),
    );
    const { result } = renderHook(() => useApiSubmit(submitFn), { wrapper });
    await act(async () => {
      await result.current.submit(undefined);
    });
    expect(screen.getByText('Units out of range.')).toBeInTheDocument();
    expect(result.current.pending).toBe(false);
  });
});
