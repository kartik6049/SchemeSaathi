/**
 * Rate limiters (NFR-05). Created per app instance so tests stay isolated.
 */
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const json = (message: string) => ({ error: { code: 'RATE_LIMITED', message } });

/** Brute-force protection for admin login: 10 attempts / 15 min per IP. */
export const createLoginLimiter = () =>
  rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: json('Too many login attempts, try again later') });

/** General API limiter: generous enough for volunteers checking many people. */
export const createApiLimiter = () =>
  rateLimit({ windowMs: 60_000, limit: env.API_RATE_LIMIT, standardHeaders: 'draft-7', legacyHeaders: false, message: json('Too many requests, slow down') });
