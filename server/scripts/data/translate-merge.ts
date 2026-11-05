/**
 * Hindi translation, step 2: validates translated chunks and merges them into
 * the dictionary used by `npm run data:build`.
 *   in:  data/translations/work/manifest.json, data/translations/work/done/*.json
 *   out: data/translations/hi.json            { [English]: Hindi }
 *
 *   npm run data:translate:merge                    merge every finished chunk
 *   npm run data:translate:merge -- --check 0007    only validate the given chunk(s), write nothing
 *
 * Missing, empty or non-Devanagari entries are reported and skipped; re-export to retry them.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { checkTranslation, type HindiDictionary } from '../../src/importer/translations.js';

const DATA = path.resolve(import.meta.dirname, '../../../data');
const DICT = path.join(DATA, 'translations/hi.json');
const WORK = path.join(DATA, 'translations/work');

const checkOnly = process.argv.includes('--check');
const only = process.argv.slice(2).filter((a) => /^\d{4}$/.test(a));

const manifest = JSON.parse(await readFile(path.join(WORK, 'manifest.json'), 'utf8')) as Record<string, string>;
const dict = JSON.parse(await readFile(DICT, 'utf8').catch(() => '{}')) as HindiDictionary;
const files = only.length ? only.map((n) => `${n}.json`) : (await readdir(path.join(WORK, 'done'))).filter((f) => f.endsWith('.json')).sort();

let added = 0;
let problems = 0;
for (const f of files) {
  const todoText = await readFile(path.join(WORK, 'todo', f), 'utf8').catch(() => null);
  if (todoText === null) {
    console.log(`${f}: no matching todo chunk (left over from an older export?) — skipped`);
    problems++;
    continue;
  }
  const todo = JSON.parse(todoText) as { id: string }[];
  let done: Record<string, unknown>;
  try {
    done = JSON.parse(await readFile(path.join(WORK, 'done', f), 'utf8'));
  } catch (err) {
    console.log(`${f}: unreadable — ${(err as Error).message}`);
    problems++;
    continue;
  }
  const bad: string[] = [];
  const ids = new Set(todo.map((t) => t.id));
  for (const id of Object.keys(done)) if (!ids.has(id)) bad.push(`${id} (not in this chunk)`);
  for (const { id } of todo) {
    const reason = checkTranslation(manifest[id], done[id]);
    if (reason) bad.push(`${id} (${reason})`);
    else if (!checkOnly) {
      dict[manifest[id]] = (done[id] as string).trim();
      added++;
    }
  }
  if (bad.length) {
    problems += bad.length;
    console.log(`${f}: ${bad.length}/${todo.length} need fixing: ${bad.join(', ')}`);
  } else if (checkOnly) console.log(`${f}: OK (${todo.length})`);
}

if (!checkOnly) {
  await writeFile(DICT, JSON.stringify(dict, null, 1));
  console.log(`Merged ${added} translations from ${files.length} chunks; dictionary has ${Object.keys(dict).length}. Problems: ${problems}`);
}
process.exitCode = checkOnly && problems ? 1 : 0;
