/**
 * Result<T, E>: the only error channel allowed across core module boundaries.
 * Calculators never throw — callers must handle the err branch explicitly,
 * which keeps API error envelopes exhaustive and predictable.
 */

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

export type Result<T, E> = Ok<T> | Err<E>;

/**
 * Wraps a value in the success branch.
 *
 * @example
 * ok(42); // { ok: true, value: 42 }
 */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/**
 * Wraps an error in the failure branch.
 *
 * @example
 * err(appError('VALIDATION_FAILED', 'monthlyUnits must be positive'));
 * // { ok: false, error: AppError }
 */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/**
 * Type guard for the success branch — narrows so `.value` is reachable.
 *
 * @example
 * const result = calculateSuryaGhar(input);
 * if (isOk(result)) {
 *   renderSavings(result.value); // result is Ok<SuryaGharResult> here
 * }
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

/**
 * Type guard for the failure branch — narrows so `.error` is reachable.
 *
 * @example
 * const result = calculateSuryaGhar(input);
 * if (isErr(result)) {
 *   return sendError(res, result.error); // result is Err<AppError> here
 * }
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}

/**
 * Transform the success value while passing errors through untouched.
 *
 * @example
 * // Derive a view model without unwrapping; an err input flows out as-is.
 * mapResult(calculateBaselineFootprint(survey), (baseline) => baseline.totalKgAnnual);
 */
export function mapResult<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

/**
 * Collapse a Result to a plain value when a safe fallback exists.
 *
 * @example
 * unwrapOr(ok(1.55), 0); // 1.55
 * unwrapOr(err('parse failed'), 0); // 0
 */
export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback;
}
