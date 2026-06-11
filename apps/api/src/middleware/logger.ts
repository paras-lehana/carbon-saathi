/**
 * Structured JSON request logging. Owns the log line shape; emits route
 * pattern, status and latency only — never bodies, queries or user text, so
 * logs stay PII-free by construction.
 */
import type { RequestHandler } from 'express';

export interface RequestLoggerOptions {
  /** Injectable clock so tests can assert latency math without sleeping. */
  readonly now?: () => number;
  /** Injectable sink — tests pass a no-op to keep suite output clean. */
  readonly sink?: (line: string) => void;
}

export function createRequestLogger(options: RequestLoggerOptions = {}): RequestHandler {
  const now = options.now ?? Date.now;
  const sink = options.sink ?? ((line: string) => process.stdout.write(`${line}\n`));

  return (req, res, next) => {
    const startMs = now();
    res.on('finish', () => {
      // Prefer the matched route pattern (e.g. /api/dashboard/:userId) over the
      // concrete URL so user identifiers never reach the logs.
      const routePath = (req.route as { path?: string } | undefined)?.path;
      const route =
        routePath !== undefined ? `${req.baseUrl}${routePath}` : req.originalUrl.split('?')[0];
      const status = res.statusCode;
      sink(
        JSON.stringify({
          // `severity` is the field name Cloud Logging promotes natively on Cloud Run.
          severity: status >= 500 ? 'ERROR' : status >= 400 ? 'WARNING' : 'INFO',
          time: new Date(now()).toISOString(),
          method: req.method,
          route,
          status,
          latencyMs: now() - startMs,
        }),
      );
    });
    next();
  };
}
