/**
 * Environment configuration.
 *
 * Loads `.env` (if present) and validates every variable with zod so the
 * process fails fast at boot with a clear message instead of misbehaving
 * later. Import `env` anywhere you need configuration — never read
 * `process.env` directly elsewhere.
 */
import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  TEST_DATABASE_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  /** Defaults to true in production; set "false" for plain-HTTP local Docker runs. */
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  /** Requests per minute per IP for the public API (raise for load tests only). */
  API_RATE_LIMIT: z.coerce.number().int().positive().default(300),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  isProd: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  /** Tests always run against the dedicated test database. */
  databaseUrl: raw.NODE_ENV === 'test' && raw.TEST_DATABASE_URL ? raw.TEST_DATABASE_URL : raw.DATABASE_URL,
  corsOrigins: raw.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
  cookieSecure: raw.COOKIE_SECURE ? raw.COOKIE_SECURE === 'true' : raw.NODE_ENV === 'production',
};
