/**
 * Admin authentication (FR-16, NFR-05).
 * Passwords are bcrypt-hashed. On unknown emails we still run a bcrypt
 * comparison against a dummy hash so response time doesn't reveal which
 * emails exist.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { pool } from '../../db/pool.js';
import { unauthorized } from '../../lib/errors.js';
import type { AdminClaims } from '../../middleware/requireAdmin.js';

export const SESSION_HOURS = 8;
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', 12);

export async function login(email: string, password: string): Promise<{ token: string; admin: Omit<AdminClaims, 'sub'> & { id: number } }> {
  const { rows } = await pool.query<{ id: number; email: string; password_hash: string; role: string }>(
    'SELECT id, email, password_hash, role FROM admin_users WHERE email = lower($1)',
    [email],
  );
  const user = rows[0];
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) throw unauthorized('Invalid email or password');

  const claims: AdminClaims = { sub: String(user.id), email: user.email, role: user.role };
  const token = jwt.sign(claims, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: `${SESSION_HOURS}h` });
  return { token, admin: { id: user.id, email: user.email, role: user.role } };
}
