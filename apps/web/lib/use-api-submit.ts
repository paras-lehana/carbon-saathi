/**
 * useApiSubmit: pending state around a single ApiResult call with the failure
 * message toasted centrally — the submit half of every panel's
 * validate → pending → call → toast machine. Callers branch on the returned
 * result for their success path; validation stays theirs.
 */
'use client';

import { useCallback, useState } from 'react';
import { useToast } from '../components/ui/Toast';
import type { ApiResult } from './api-client';

export interface UseApiSubmitResult<TInput, TOutput> {
  pending: boolean;
  /** Runs submitFn; on failure the error is toasted before this resolves. */
  submit: (input: TInput) => Promise<ApiResult<TOutput>>;
}

export function useApiSubmit<TInput, TOutput>(
  submitFn: (input: TInput) => Promise<ApiResult<TOutput>>,
): UseApiSubmitResult<TInput, TOutput> {
  const { showToast } = useToast();
  const [pending, setPending] = useState(false);

  const submit = useCallback(
    async (input: TInput): Promise<ApiResult<TOutput>> => {
      setPending(true);
      try {
        const result = await submitFn(input);
        if (!result.ok) showToast(result.error.message, 'error');
        return result;
      } finally {
        // finally over a success-path reset: pending must clear even if a
        // non-conforming submitFn throws despite the never-throw contract.
        setPending(false);
      }
    },
    [showToast, submitFn],
  );

  return { pending, submit };
}
