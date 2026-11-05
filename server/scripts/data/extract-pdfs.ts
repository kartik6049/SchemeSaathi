/**
 * Step 1 of the data pipeline: extracts text from every downloaded myScheme
 * PDF and parses it into sections.
 *   in:  data/raw/hf_gov_myscheme/pdf/*.pdf
 *   out: data/processed/details.json   { [slug]: SchemeDetails }
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parseSchemeText, type SchemeDetails } from '../../src/importer/pdfSections.js';

const DATA = path.resolve(import.meta.dirname, '../../../data');
const PDF_DIR = path.join(DATA, 'raw/hf_gov_myscheme/pdf');

async function pdfText(file: string): Promise<string> {
  const doc = await getDocument({ data: new Uint8Array(await readFile(file)), verbosity: 0 }).promise;
  let out = '';
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent();
    let lastY: number | null = null;
    for (const item of content.items) {
      if (!('str' in item)) continue;
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) out += ' ';
      out += item.str;
      lastY = y;
    }
    out += ' ';
  }
  await doc.destroy();
  return out;
}

const files = (await readdir(PDF_DIR)).filter((f) => f.endsWith('.pdf'));
const result: Record<string, SchemeDetails> = {};
let failed = 0;
for (const f of files) {
  try {
    const parsed = parseSchemeText(await pdfText(path.join(PDF_DIR, f)));
    if (parsed) result[f.replace(/\.pdf$/, '')] = parsed;
    else failed++;
  } catch {
    failed++;
  }
}
await mkdir(path.join(DATA, 'processed'), { recursive: true });
await writeFile(path.join(DATA, 'processed/details.json'), JSON.stringify(result, null, 1));
console.log(`Parsed ${Object.keys(result).length}/${files.length} PDFs (${failed} unparseable) -> data/processed/details.json`);
