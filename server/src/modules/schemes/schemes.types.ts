/**
 * Scheme domain types.
 *
 * `SchemeInput` is the shape used to create/update a scheme (admin API and
 * seed data). `Scheme` is what the API returns. Text fields are always
 * bilingual `{ en, hi }` objects so the UI can switch language instantly.
 */
import type { Localized } from '../../lib/i18n.js';
import type { Rule } from '../../engine/types.js';

export interface SchemeInput {
  slug: string;
  name: Localized;
  ministry: Localized;
  state: string | null;
  category: string;
  beneficiaryTypes: string[];
  summary: Localized;
  benefits: Localized;
  eligibility: Localized;
  howToApply: Localized;
  officialUrl: string;
  benefitTier: number;
  deadline?: string | null;
  lastVerifiedAt?: string;
  isActive?: boolean;
  rules: Rule[];
  /** Document codes, e.g. ['aadhaar', 'income_cert'] */
  documents: string[];
  /** Import metadata (optional on input; defaults suit hand-entered schemes). */
  source?: SchemeSource;
  audience?: 'individual' | 'family' | 'organisation';
  /** false = browse/search only, never auto-matched. */
  matchable?: boolean;
  /** true = auto-imported and not yet checked by an admin. */
  needsReview?: boolean;
  sourceUrl?: string | null;
  keywords?: string;
  importNotes?: string[];
}

export type SchemeSource = 'curated' | 'myscheme' | 'admin';

export interface SchemeDocument {
  code: string;
  name: Localized;
}

export interface Scheme
  extends Omit<SchemeInput, 'documents' | 'deadline' | 'lastVerifiedAt' | 'isActive' | 'source' | 'audience' | 'matchable' | 'needsReview'> {
  id: number;
  deadline: string | null;
  lastVerifiedAt: string;
  isActive: boolean;
  source: SchemeSource;
  audience: 'individual' | 'family' | 'organisation';
  matchable: boolean;
  needsReview: boolean;
  sourceUrl: string | null;
  importNotes: string[];
  keywords: string;
  updatedAt: string;
  documents: SchemeDocument[];
}

/** Compact card used in lists and match results. */
export type SchemeSummary = Pick<
  Scheme,
  | 'id' | 'slug' | 'name' | 'ministry' | 'state' | 'category' | 'beneficiaryTypes' | 'summary' | 'benefitTier' | 'deadline'
  | 'lastVerifiedAt' | 'isActive' | 'source' | 'needsReview' | 'matchable'
>;
