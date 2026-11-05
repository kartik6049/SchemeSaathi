/**
 * Logs method, path, status and duration. Deliberately does NOT log bodies,
 * query strings, IPs or user agents (privacy, NFR-07).
 */
import type { RequestHandler } from 'express';
import { logger } from '../lib/logger.js';

export const requestLogger: RequestHandler = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${ms.toFixed(1)}ms`);
  });
  next();
};
