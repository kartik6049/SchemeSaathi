/**
 * PostgreSQL connection pool.
 *
 * A single shared `pg.Pool` for the whole process. Use `query()` for one-off
 * statements and `withTransaction()` when several statements must succeed or
 * fail together (e.g. saving a scheme together with its rules).
 */
import pg from 'pg';
import { env } from '../config/env.js';

// Return DATE columns as 'YYYY-MM-DD' strings instead of JS Dates (avoids timezone shifts).
pg.types.setTypeParser(1082, (v) => v);

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
});

export function query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params?: unknown[]) {
  return pool.query<T>(text, params);
}

export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
