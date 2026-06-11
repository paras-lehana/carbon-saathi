/**
 * AppError taxonomy shared by every layer: a closed set of error codes mapped
 * to HTTP statuses and user-safe default messages. Security: messages go to
 * clients verbatim, so they must never leak internals (stacks, raw input).
 */

export const ERROR_DEFINITIONS = {
  VALIDATION_FAILED: { httpStatus: 400, defaultMessage: 'The request failed validation.' },
  NOT_FOUND: { httpStatus: 404, defaultMessage: 'The requested resource was not found.' },
  RATE_LIMITED: {
    httpStatus: 429,
    defaultMessage: 'Too many requests — please retry in a minute.',
  },
  UPSTREAM_FAILURE: {
    httpStatus: 502,
    defaultMessage: 'An upstream service did not respond correctly.',
  },
  INTERNAL: { httpStatus: 500, defaultMessage: 'Something went wrong on our side.' },
} as const satisfies Record<string, { httpStatus: number; defaultMessage: string }>;

export type ErrorCode = keyof typeof ERROR_DEFINITIONS;

export interface AppError {
  readonly code: ErrorCode;
  readonly message: string;
  /** Optional structured context for server logs — never serialised to clients. */
  readonly details?: unknown;
}

export function appError(code: ErrorCode, message?: string, details?: unknown): AppError {
  return { code, message: message ?? ERROR_DEFINITIONS[code].defaultMessage, details };
}

export function httpStatusFor(code: ErrorCode): number {
  return ERROR_DEFINITIONS[code].httpStatus;
}

/** Runtime guard so the API layer can tell AppError apart from unknown throwables. */
export function isAppError(value: unknown): value is AppError {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { code?: unknown; message?: unknown };
  return (
    typeof candidate.code === 'string' &&
    candidate.code in ERROR_DEFINITIONS &&
    typeof candidate.message === 'string'
  );
}
