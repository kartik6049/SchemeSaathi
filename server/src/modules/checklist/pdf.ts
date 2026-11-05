/**
 * Checklist PDF renderer (pdfkit).
 *
 * Hindi support: the bundled Noto Sans Devanagari font ships Devanagari and
 * Latin glyphs as separate subset files, so `writeMixed()` splits each line
 * into runs by script and switches font per run. fontkit (inside pdfkit)
 * performs the Indic shaping (matras, conjuncts).
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import type { Lang } from '../../lib/i18n.js';
import type { Checklist } from './checklist.service.js';

const require = createRequire(import.meta.url);
const FONT_DIR = path.join(path.dirname(require.resolve('@fontsource/noto-sans-devanagari/package.json')), 'files');
const font = (subset: 'devanagari' | 'latin', weight: 400 | 700) =>
  path.join(FONT_DIR, `noto-sans-devanagari-${subset}-${weight}-normal.woff`);

const DEVANAGARI = /[ऀ-ॿ₹‌‍꣠-ꣿ]/;

const T = {
  title: { en: 'Document Checklist', hi: 'दस्तावेज़ चेकलिस्ट' },
  schemes: { en: 'Selected schemes', hi: 'चुनी गई योजनाएँ' },
  docs: { en: 'Documents to carry', hi: 'साथ ले जाने वाले दस्तावेज़' },
  neededFor: { en: 'Needed for', hi: 'इनके लिए आवश्यक' },
  disclaimer: {
    en: 'SchemeSaathi shows likely eligibility only and is not a government website. Please confirm requirements on the official portal before applying. Never pay anyone for scheme information.',
    hi: 'स्कीमसाथी केवल संभावित पात्रता दिखाता है और यह सरकारी वेबसाइट नहीं है। आवेदन से पहले आधिकारिक पोर्टल पर आवश्यकताओं की पुष्टि करें। योजना की जानकारी के लिए किसी को पैसे न दें।',
  },
  generated: { en: 'Generated on', hi: 'बनाया गया' },
};

type Doc = PDFKit.PDFDocument;

/**
 * Splits text into [isDevanagari, chunk] runs. Only whitespace may join either
 * run; punctuation like ( ) : / - must use the Latin font because the
 * Devanagari subset has no glyphs for it.
 */
export function splitRuns(text: string): [boolean, string][] {
  const runs: [boolean, string][] = [];
  for (const ch of text) {
    const neutral = /\s/.test(ch);
    const isDev = DEVANAGARI.test(ch);
    const last = runs[runs.length - 1];
    if (last && (neutral || last[0] === isDev)) last[1] += ch;
    else runs.push([isDev, ch]);
  }
  return runs;
}

function writeMixed(doc: Doc, text: string, opts: { size: number; bold?: boolean; color?: string; indent?: number; gap?: number }) {
  const runs = splitRuns(text);
  doc.fillColor(opts.color ?? '#111827').fontSize(opts.size);
  const x = doc.page.margins.left + (opts.indent ?? 0);
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right - (opts.indent ?? 0);
  runs.forEach(([isDev, chunk], i) => {
    doc.font(`${isDev ? 'dev' : 'lat'}-${opts.bold ? 700 : 400}`);
    const continued = i < runs.length - 1;
    if (i === 0) doc.text(chunk, x, doc.y, { width, continued });
    else doc.text(chunk, { continued });
  });
  doc.moveDown(opts.gap ?? 0.3);
}

export function renderChecklistPdf(checklist: Checklist, lang: Lang): Doc {
  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: T.title[lang], Author: 'SchemeSaathi' } });
  doc.registerFont('dev-400', font('devanagari', 400));
  doc.registerFont('dev-700', font('devanagari', 700));
  doc.registerFont('lat-400', font('latin', 400));
  doc.registerFont('lat-700', font('latin', 700));

  // Header band
  doc.rect(0, 0, doc.page.width, 80).fill('#4f46e5');
  doc.fillColor('#ffffff').font('lat-700').fontSize(22).text('SchemeSaathi', 50, 22);
  doc.y = 50;
  writeMixed(doc, T.title[lang], { size: 12, color: '#e0e7ff' });
  doc.y = 105;

  writeMixed(doc, T.schemes[lang], { size: 14, bold: true, color: '#4f46e5', gap: 0.4 });
  checklist.schemes.forEach((s, i) => {
    writeMixed(doc, `${i + 1}. ${s.name[lang]}`, { size: 11, gap: 0 });
    doc.font('lat-400').fontSize(9).fillColor('#2563eb').text(s.officialUrl, { link: s.officialUrl, indent: 14 });
    doc.moveDown(0.3);
  });

  doc.moveDown(0.6);
  writeMixed(doc, T.docs[lang], { size: 14, bold: true, color: '#4f46e5', gap: 0.5 });

  for (const item of checklist.documents) {
    if (doc.y > doc.page.height - 120) doc.addPage();
    const y = doc.y + 2;
    doc.lineWidth(1).strokeColor('#6b7280').rect(doc.page.margins.left, y, 11, 11).stroke();
    writeMixed(doc, item.name[lang], { size: 11, bold: true, indent: 20, gap: 0 });
    writeMixed(doc, `${T.neededFor[lang]}: ${item.schemes.map((s) => s.name[lang]).join('; ')}`, {
      size: 9,
      color: '#4b5563',
      indent: 20,
      gap: 0.6,
    });
  }

  doc.moveDown(1);
  if (doc.y > doc.page.height - 130) doc.addPage();
  doc.rect(doc.page.margins.left, doc.y, doc.page.width - 100, 1).fill('#e5e7eb');
  doc.moveDown(0.6);
  writeMixed(doc, T.disclaimer[lang], { size: 9, color: '#6b7280' });
  writeMixed(doc, `${T.generated[lang]}: ${new Date().toISOString().slice(0, 10)}`, { size: 8, color: '#9ca3af' });

  doc.end();
  return doc;
}
