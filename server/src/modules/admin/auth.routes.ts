/**
 * Admin session endpoints.
 *   POST /api/admin/auth/login   { email, password } -> sets httpOnly cookie
 *   POST /api/admin/auth/logout  clears the cookie
 *   GET  /api/admin/auth/me      current admin (401 if not logged in)
 * The JWT lives only in an httpOnly, SameSite=Strict cookie so page scripts
 * can't read it (XSS-resistant) and other sites can't send it (CSRF-resistant).
 */
import { Router, type CookieOptions } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { ADMIN_COOKIE, requireAdmin } from '../../middleware/requireAdmin.js';
import { createLoginLimiter } from '../../middleware/rateLimiters.js';
import { login, SESSION_HOURS } from './auth.service.js';

const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: env.cookieSecure,
  path: '/api',
});

const credentials = z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200) });

export function createAuthRouter() {
  const router = Router();

  router.post('/login', createLoginLimiter(), async (req, res) => {
    const { email, password } = credentials.parse(req.body);
    const { token, admin } = await login(email, password);
    res.cookie(ADMIN_COOKIE, token, { ...cookieOptions(), maxAge: SESSION_HOURS * 3600_000 }).json({ admin });
  });

  router.post('/logout', (_req, res) => {
    res.clearCookie(ADMIN_COOKIE, cookieOptions()).status(204).end();
  });

  router.get('/me', requireAdmin, (req, res) => {
    res.json({ admin: { id: Number(req.admin!.sub), email: req.admin!.email, role: req.admin!.role } });
  });

  return router;
}
