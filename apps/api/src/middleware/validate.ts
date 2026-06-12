/**
 * Request-boundary helpers: zod body validation, the canonical error
 * envelope, and async handler wrapping. This module owns the wire shape of
 * every error response; routes own only their success payloads.
 */
import { appError, httpStatusFor, type AppError } from '@carbon-saathi/core';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';

const MAX_ERROR_MESSAGE_CHARS = 200; // bounded so a hostile payload cannot reflect itself back at length

/** Single serialisation point for AppError — `details` is never sent to clients. */
export function sendError(res: Response, error: AppError): void {
  res.status(httpStatusFor(error.code)).json({
    error: { code: error.code, message: error.message.slice(0, MAX_ERROR_MESSAGE_CHARS) },
  });
}

/**
 * Security: zod messages can echo attacker-controlled input. unrecognized_keys
 * lists the offending key names verbatim, and exotic path segments (record or
 * union keys) could smuggle payload text into the message — so unknown-key
 * failures get a fixed message, and the path prefix is included only when
 * every segment is plainly alphanumeric (array indices qualify).
 */
function safeIssueMessage(issue: z.ZodIssue): string {
  if (issue.code === 'unrecognized_keys') return 'Unknown keys in request body.';
  const pathIsSafe = issue.path.every((segment) => /^[A-Za-z0-9_]+$/.test(String(segment)));
  const path = pathIsSafe ? issue.path.join('.') : '';
  return path.length > 0 ? `${path}: ${issue.message}` : issue.message;
}

/**
 * Validates req.body against a schema and stashes the typed result in
 * res.locals, so handlers never touch the unvalidated body object. The Input
 * type parameter stays `unknown` so transform schemas (whose input is wider
 * than their output, e.g. bootstrapRequestSchema) still bind T to the OUTPUT.
 */
export function validateBody<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>): RequestHandler {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, appError('VALIDATION_FAILED', safeIssueMessage(parsed.error.issues[0])));
      return;
    }
    res.locals.parsedBody = parsed.data;
    next();
  };
}

/**
 * Typed accessor for the value validateBody stored. The schema parameter
 * exists purely to bind T to the schema that validated the body — pass the
 * SAME schema given to validateBody. At runtime it is ignored: the body was
 * already parsed, so this still just reads res.locals.parsedBody.
 */
export function parsedBody<T>(res: Response, _schema: z.ZodType<T, z.ZodTypeDef, unknown>): T {
  return res.locals.parsedBody as T;
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Express 4 does not catch promise rejections: an unhandled async failure
 * would crash the process instead of producing a 500 envelope. Every async
 * route must be wrapped.
 */
export function asyncHandler(handler: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
