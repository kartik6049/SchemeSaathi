/**
 * Parses the text of a myScheme scheme-page PDF (Hugging Face gov_myscheme
 * dataset) into its sections. The page text is a flat stream like:
 *   <nav junk> Check Eligibility <State> <Name> <tags> Details "…" Benefits …
 *   Eligibility … Application Process … Documents Required … Frequently Asked Questions …
 */

export interface SchemeDetails {
  details: string;
  benefits: string;
  eligibility: string[];
  applicationProcess: string;
  documents: string[];
  department?: string;
}

/** Repairs UTF-8 text that was mis-decoded as Windows-1252 (â€œ, ï»¿ …). */
export function fixMojibake(s: string): string {
  return s
    .replace(/â€œ|â€\u009d|â€/g, '"')
    .replace(/â€™|â€˜/g, "'")
    .replace(/â€“/g, '–')
    .replace(/â€”/g, '—')
    .replace(/â‚¹/g, '₹')
    .replace(/ï»¿/g, '')
    .replace(/Â©/g, '©')
    .replace(/Â/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

const SECTION_ORDER = ['Details', 'Benefits', 'Eligibility', 'Application Process', 'Documents Required', 'Frequently Asked Questions'];

/** Splits run-together sentences: "…of 18 years.The applicant…" -> two items. */
export function splitSentences(s: string): string[] {
  return s
    .split(/(?<=[.;:])\s*(?=[A-Z(])|\n+/)
    .map((x) => x.trim().replace(/^[•\-–\d.)]+\s*/, ''))
    .filter((x) => x.length > 3);
}

/** Splits a run-together document list: "Aadhaar CardIncome CertificateProof of Age" -> 3 items. */
export function splitDocuments(s: string): string[] {
  const parts = s
    .split(/(?<=[a-z)\].])(?=[A-Z])|\n+|(?:\s*\d+\.\s+)/)
    .map((x) => x.trim().replace(/[.;,]$/, ''))
    .filter((x) => x.length >= 3 && x.length <= 140);
  return [...new Set(parts)];
}

export function parseSchemeText(raw: string): SchemeDetails | null {
  const text = fixMojibake(raw.replace(/\n/g, ' '));
  // Content starts after the first "Check Eligibility"; take the first "Details" after the tag chips.
  const start = text.indexOf('Check Eligibility');
  if (start < 0) return null;
  const body = text.slice(start);

  const idx: number[] = [];
  let from = 0;
  for (const h of SECTION_ORDER) {
    const i = body.indexOf(h, from);
    idx.push(i);
    if (i >= 0) from = i + h.length;
  }
  if (idx[0] < 0 || idx[1] < 0 || idx[2] < 0) return null;

  const section = (n: number) => {
    const s = idx[n];
    if (s < 0) return '';
    const next = idx.slice(n + 1).find((i) => i > s) ?? body.length;
    return body.slice(s + SECTION_ORDER[n].length, next).trim();
  };

  const details = section(0);
  const department = details.match(/is a (?:scheme|programme|program|initiative) (?:by|of|launched by) (?:the )?(.{6,120}?)(?:\.|,? (?:Govt|Government) of)/i)?.[1];

  return {
    details,
    benefits: section(1),
    eligibility: splitSentences(section(2)),
    applicationProcess: section(3),
    documents: splitDocuments(section(4)),
    department: department?.trim(),
  };
}
