/**
 * Database seeder (idempotent).
 *
 *   npm run db:seed            insert documents, missing schemes and the admin user
 *   npm run db:seed -- --force overwrite existing schemes with the seed version
 *
 * Every seed scheme's rules are validated with the same validator the admin
 * panel uses, so bad seed data fails loudly.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { pool } from '../pool.js';
import { env } from '../../config/env.js';
import { validateRules } from '../../engine/validate.js';
import * as schemesRepo from '../../modules/schemes/schemes.repository.js';
import { DOCUMENTS } from './documents.data.js';
import { SCHEMES, type SeedScheme } from './schemes.data.js';

function toInput(s: SeedScheme) {
  return { ...s, deadline: s.deadline ?? null, isActive: true, source: 'curated' as const };
}

export async function seed({ force = false, log = console.log } = {}) {
  for (const d of DOCUMENTS) {
    await pool.query(
      `INSERT INTO documents (code, name_en, name_hi) VALUES ($1, $2, $3)
       ON CONFLICT (code) DO UPDATE SET name_en = EXCLUDED.name_en, name_hi = EXCLUDED.name_hi`,
      [d.code, d.en, d.hi],
    );
  }

  let created = 0;
  let updated = 0;
  for (const s of SCHEMES) {
    const errors = validateRules(s.rules);
    if (errors.length) throw new Error(`Seed scheme "${s.slug}" has invalid rules: ${JSON.stringify(errors)}`);

    const { rows } = await pool.query<{ id: number }>('SELECT id FROM schemes WHERE slug = $1', [s.slug]);
    if (!rows[0]) {
      await schemesRepo.create(toInput(s));
      created++;
    } else if (force) {
      await schemesRepo.update(rows[0].id, toInput(s));
      updated++;
    }
  }
  log(`Seeded ${DOCUMENTS.length} documents, ${created} new schemes${force ? `, ${updated} overwritten` : ''}`);

  if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    const hash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
    const { rowCount } = await pool.query(
      `INSERT INTO admin_users (email, password_hash) VALUES (lower($1), $2) ON CONFLICT (email) DO NOTHING`,
      [env.ADMIN_EMAIL, hash],
    );
    if (rowCount) log(`Created admin user ${env.ADMIN_EMAIL}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  seed({ force: process.argv.includes('--force') })
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
