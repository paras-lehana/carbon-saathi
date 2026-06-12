/** Result helpers: construction, narrowing, mapping and fallbacks. */
import { describe, expect, it } from 'vitest';
import { err, isErr, isOk, mapResult, ok, unwrapOr, type Result } from '../result';

describe('result', () => {
  it('ok() wraps a value and narrows via isOk', () => {
    const result: Result<number, string> = ok(42);
    expect(result.ok).toBe(true);
    expect(isOk(result) && result.value).toBe(42);
  });

  it('err() wraps an error and narrows via isErr', () => {
    const result: Result<number, string> = err('boom');
    expect(result.ok).toBe(false);
    expect(isErr(result) && result.error).toBe('boom');
  });

  it('mapResult transforms the success value', () => {
    const doubled = mapResult(ok(21), (n) => n * 2);
    expect(unwrapOr(doubled, 0)).toBe(42);
  });

  it('mapResult passes errors through untouched', () => {
    const result: Result<number, string> = err('nope');
    const mapped = mapResult(result, (n: number) => n * 2);
    expect(isErr(mapped) && mapped.error).toBe('nope');
  });

  it('unwrapOr returns the fallback for errors', () => {
    expect(unwrapOr(err('x'), 7)).toBe(7);
    expect(unwrapOr(ok(1), 7)).toBe(1);
  });
});
