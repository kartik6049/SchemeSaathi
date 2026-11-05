/**
 * Imports the processed myScheme catalogue into the database (idempotent).
 *
 *   npm run db:import                       uses data/processed/catalogue.json
 *   npm run db:import -- --file other.json
 *
 * Rules:
 *  - New slugs are inserted with source='myscheme', needs_review=true.
 *  - Existing un-reviewed imports are refreshed from the file.
 *  - Curated, admin-created and admin-reviewed schemes are never touched.
 *  - Unknown document names become new rows in `documents`; an empty Hindi name
 *    is filled in when the catalogue has one (admin-entered Hindi is kept).
 * Work is committed in batches so a failure doesn't lose everything.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, withTransaction } from '../pool.js';
import type { ImportedScheme } from '../../importer/mapMyScheme.js';
import * as repo from '../../modules/schemes/schemes.repository.js';

const DEFAULT_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../data/processed/catalogue.json');
const BATCH = 250;

export async function importCatalogue(file = DEFAULT_FILE, log = console.log) {
  const schemes = JSON.parse(await readFile(file, 'utf8')) as ImportedScheme[];

  // 1. New documents (deduplicated by code)
  const docs = new Map<string, [string, string]>();
  for (const s of schemes) for (const [code, en, hi = ''] of s.newDocuments) if (!docs.get(code)?.[1]) docs.set(code, [en, hi]);
  const codes = [...docs.keys()];
  await pool.query(
    `INSERT INTO documents (code, name_en, name_hi)
     SELECT c, n, h FROM unnest($1::text[], $2::text[], $3::text[]) AS t(c, n, h)
     ON CONFLICT (code) DO UPDATE SET name_hi = EXCLUDED.name_hi WHERE documents.name_hi = ''`,
    [codes, codes.map((c) => docs.get(c)![0]), codes.map((c) => docs.get(c)![1])],
  );

  // 2. Existing rows: decide insert / refresh / skip
  const { rows } = await pool.query<{ id: number; slug: string; source: string; needs_review: boolean }>(
    'SELECT id, slug, source, needs_review FROM schemes',
  );
  const existing = new Map(rows.map((r) => [r.slug, r]));

  let inserted = 0;
  let refreshed = 0;
  let protectedRows = 0;
  for (let i = 0; i < schemes.length; i += BATCH) {
    await withTransaction(async (client) => {
      for (const s of schemes.slice(i, i + BATCH)) {
        const input = { ...s, importNotes: s.signals };
        const row = existing.get(s.slug);
        if (!row) {
          await repo.create(input, client, { returning: false });
          inserted++;
        } else if (row.source === 'myscheme' && row.needs_review) {
          await repo.update(row.id, input, client, { returning: false });
          refreshed++;
        } else {
          protectedRows++;
        }
      }
    });
    log(`  ${Math.min(i + BATCH, schemes.length)}/${schemes.length}`);
  }
  log(`Imported: ${inserted} new, ${refreshed} refreshed, ${protectedRows} kept (curated/reviewed), ${codes.length} document types`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const i = process.argv.indexOf('--file');
  importCatalogue(i > 0 ? path.resolve(process.argv[i + 1]) : undefined)
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
