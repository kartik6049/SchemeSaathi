/**
 * Hindi translation, step 1: exports every English string in the catalogue that
 * has no Hindi yet, as small chunks for translators (human or machine).
 *   in:  data/processed/catalogue.json
 *        data/translations/hi.json             (existing dictionary, if any)
 *   out: data/translations/work/manifest.json  { [id]: English }
 *        data/translations/work/todo/NNNN.json [{ id, en }]   ~6,000 characters each
 *
 * Translators write data/translations/work/done/NNNN.json as { [id]: Hindi },
 * then `npm run data:translate:merge` validates and merges them into hi.json.
 * Names, ministries, summaries and document names come first; long detail text last.
 */
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ImportedScheme } from '../../src/importer/mapMyScheme.js';
import { translatableStrings, type HindiDictionary } from '../../src/importer/translations.js';

const DATA = path.resolve(import.meta.dirname, '../../../data');
const DICT = path.join(DATA, 'translations/hi.json');
const WORK = path.join(DATA, 'translations/work');
const CHUNK_CHARS = 6000;

const schemes = JSON.parse(await readFile(path.join(DATA, 'processed/catalogue.json'), 'utf8')) as ImportedScheme[];
const dict = JSON.parse(await readFile(DICT, 'utf8').catch(() => '{}')) as HindiDictionary;

const short: string[] = [];
const long: string[] = [];
const seen = new Set<string>();
for (const s of schemes) {
  for (const en of translatableStrings(s)) {
    if (seen.has(en) || dict[en]) continue;
    seen.add(en);
    (en.length > 400 && en !== s.summary.en ? long : short).push(en);
  }
}

// Ids are renumbered on every export, so finished chunks from the previous export would be
// merged against the wrong English. Move them aside (merge them first if you haven't).
const stale = (await readdir(path.join(WORK, 'done')).catch(() => [])).filter((f) => f.endsWith('.json'));
if (stale.length) {
  const archive = path.join(WORK, 'archive', new Date().toISOString().replace(/[:.]/g, '-'));
  await mkdir(path.dirname(archive), { recursive: true });
  await rename(path.join(WORK, 'done'), archive);
  for (const f of ['manifest.json', 'todo']) await rename(path.join(WORK, f), path.join(archive, f)).catch(() => {});
  console.log(`Moved ${stale.length} finished chunks of the previous export to ${path.relative(process.cwd(), archive)} (run data:translate:merge first if they weren't merged)`);
}
await rm(path.join(WORK, 'todo'), { recursive: true, force: true });
await mkdir(path.join(WORK, 'todo'), { recursive: true });
await mkdir(path.join(WORK, 'done'), { recursive: true });

const manifest: Record<string, string> = {};
let chunk: { id: string; en: string }[] = [];
let size = 0;
let n = 0;
const flush = async () => {
  if (!chunk.length) return;
  await writeFile(path.join(WORK, 'todo', `${String(n++).padStart(4, '0')}.json`), JSON.stringify(chunk, null, 1));
  chunk = [];
  size = 0;
};
let id = 0;
for (const en of [...short, ...long]) {
  if (size + en.length > CHUNK_CHARS) await flush();
  const key = String(id++);
  manifest[key] = en;
  chunk.push({ id: key, en });
  size += en.length;
}
await flush();
await writeFile(path.join(WORK, 'manifest.json'), JSON.stringify(manifest));

const chars = [...short, ...long].reduce((a, s) => a + s.length, 0);
console.log(`${id} strings (${chars.toLocaleString()} characters) in ${n} chunks → ${path.relative(process.cwd(), WORK)}/todo`);
console.log(`Already translated: ${Object.keys(dict).length}`);
