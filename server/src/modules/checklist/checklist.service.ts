/**
 * Document checklist (FR-10).
 * Combines the required documents of several schemes into one
 * de-duplicated list, noting which schemes need each document.
 */
import { notFound } from '../../lib/errors.js';
import type { Localized } from '../../lib/i18n.js';
import { findBySlugs } from '../schemes/schemes.repository.js';

export interface ChecklistItem {
  code: string;
  name: Localized;
  schemes: { slug: string; name: Localized }[];
}

export interface Checklist {
  schemes: { slug: string; name: Localized; officialUrl: string }[];
  documents: ChecklistItem[];
}

export async function buildChecklist(slugs: string[]): Promise<Checklist> {
  const unique = [...new Set(slugs)];
  const schemes = await findBySlugs(unique);
  if (!schemes.length) throw notFound('Schemes');

  // Keep the user's selection order.
  schemes.sort((a, b) => unique.indexOf(a.slug) - unique.indexOf(b.slug));

  const byCode = new Map<string, ChecklistItem>();
  for (const s of schemes) {
    for (const d of s.documents) {
      if (!byCode.has(d.code)) byCode.set(d.code, { code: d.code, name: d.name, schemes: [] });
      byCode.get(d.code)!.schemes.push({ slug: s.slug, name: s.name });
    }
  }

  // Documents needed by the most schemes first.
  const documents = [...byCode.values()].sort((a, b) => b.schemes.length - a.schemes.length);
  return {
    schemes: schemes.map((s) => ({ slug: s.slug, name: s.name, officialUrl: s.officialUrl })),
    documents,
  };
}
