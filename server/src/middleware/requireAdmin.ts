/**
 * Guards admin routes (FR-16). Reads the JWT from the httpOnly `ss_admin`
 * cookie, verifies it and attaches `req.admin`. Responds 401 otherwise.
 */
import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { unauthorized } from '../lib/errors.js';

export const ADMIN_COOKIE = 'ss_admin';

export interface AdminClaims {
  sub: string;
  email: string;
  role: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    admin?: AdminClaims;
  }
}

export const requireAdmin: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.[ADMIN_COOKIE];
  if (!token) return next(unauthorized());
  try {
    req.admin = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as AdminClaims;
    next();
  } catch {
    next(unauthorized('Session expired, please log in again'));
  }
};
