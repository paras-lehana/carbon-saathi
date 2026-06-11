/** AppError taxonomy: code → HTTP status mapping and safe default messages. */
import { describe, expect, it } from 'vitest';
import { appError, httpStatusFor, isAppError, type ErrorCode } from '../errors';

describe('errors', () => {
  it('maps every error code to its HTTP status', () => {
    const expected: Record<ErrorCode, number> = {
      VALIDATION_FAILED: 400,
      NOT_FOUND: 404,
      RATE_LIMITED: 429,
      UPSTREAM_FAILURE: 502,
      INTERNAL: 500,
    };
    for (const [code, status] of Object.entries(expected) as Array<[ErrorCode, number]>) {
      expect(httpStatusFor(code)).toBe(status);
    }
  });

  it('provides a non-empty safe default message', () => {
    const error = appError('INTERNAL');
    expect(error.message.length).toBeGreaterThan(0);
    expect(error.code).toBe('INTERNAL');
  });

  it('uses a custom message when provided', () => {
    expect(appError('VALIDATION_FAILED', 'monthlyUnits out of range').message).toBe(
      'monthlyUnits out of range',
    );
  });

  it('isAppError accepts real AppErrors and rejects look-alikes', () => {
    expect(isAppError(appError('NOT_FOUND'))).toBe(true);
    expect(isAppError({ code: 'SOMETHING_ELSE', message: 'x' })).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError('VALIDATION_FAILED')).toBe(false);
  });
});
