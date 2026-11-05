/**
 * Central error handler + 404 handler.
 * Maps AppError, ZodError, malformed JSON and Postgres unique violations to
 * consistent JSON. Unexpected errors return a generic 500 (no stack leaks).
 */
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'BAD_JSON', message: 'Request body is not valid JSON' } });
    return;
  }
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'TOO_LARGE', message: 'Request body too large' } });
    return;
  }
  if (err?.code === '23505') {
    res.status(409).json({ error: { code: 'CONFLICT', message: 'A record with this value already exists' } });
    return;
  }
  logger.error('Unhandled error', { path: req.path, message: err?.message, stack: err?.stack });
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
};
