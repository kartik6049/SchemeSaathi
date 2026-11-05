/**
 * Integration-test database helpers: wipe + migrate + seed the dedicated
 * test database so every test file starts from the same known state.
 */
import { migrate } from '../../src/db/migrate.js';
import { pool } from '../../src/db/pool.js';
import { seed } from '../../src/db/seed/index.js';
import { invalidateSchemeCache } from '../../src/modules/schemes/schemes.service.js';

const silent = () => {};

export async function resetDb() {
  if (!pool.options.connectionString?.includes('_test')) {
    throw new Error('Refusing to reset a non-test database');
  }
  await migrate({ reset: true, log: silent });
  await seed({ log: silent });
  invalidateSchemeCache();
}

export { pool };
