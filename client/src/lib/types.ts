/**
 * API types — mirror the server's response shapes (server/src/modules/*).
 * Text is always bilingual `{ en, hi }`; use `useLocalized()` to pick one.
 */
export type Lang = 'en' | 'hi';
export interface Localized {
  en: string;
  hi: string;
}

export type FieldType = 'enum' | 'number' | 'boolean' | 'range';
export interface Option {
  value: string;
  label: Localized;
}
export interface ShowIf {
  field: string;
  operator: '=' | 'in' | '>=' | '<=';
  value: string | number | boolean | string[];
}
export interface Question {
  key: string;
  type: FieldType;
  label: Localized;
  help?: Localized;
  required: boolean;
  min?: number;
  max?: number;
  options?: Option[];
  /** Show only when all conditions hold for the answers so far. */
  showIf?: ShowIf[];
}
export interface QuestionStep {
  step: number;
  fields: Question[];
}
export interface QuestionsResponse {
  steps: QuestionStep[];
  totalSteps: number;
}

export type ProfileValue = string | number | boolean;
export type Profile = Record<string, ProfileValue | undefined>;

export type SchemeSource = 'curated' | 'myscheme' | 'admin';

export interface SchemeSummary {
  id: number;
  slug: string;
  name: Localized;
  ministry: Localized;
  state: string | null;
  category: string;
  beneficiaryTypes: string[];
  summary: Localized;
  benefitTier: number;
  deadline: string | null;
  lastVerifiedAt: string;
  isActive: boolean;
  source: SchemeSource;
  /** Auto-imported and not yet checked by an admin. */
  needsReview: boolean;
  matchable: boolean;
}

/** The compact scheme shape inside match results. */
export type ResultScheme = Pick<SchemeSummary, 'slug' | 'name' | 'state' | 'category' | 'summary' | 'benefitTier' | 'deadline' | 'lastVerifiedAt' | 'source' | 'needsReview'>;

export type Operator = '=' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'not_in';
export type RuleValue = string | number | boolean | string[];
export interface Rule {
  groupId: number;
  field: string;
  operator: Operator;
  value: RuleValue;
}

export interface SchemeDocument {
  code: string;
  name: Localized;
}

export interface Scheme extends SchemeSummary {
  benefits: Localized;
  eligibility: Localized;
  howToApply: Localized;
  officialUrl: string;
  updatedAt: string;
  rules: Rule[];
  documents: SchemeDocument[];
  audience: 'individual' | 'family' | 'organisation';
  sourceUrl: string | null;
  importNotes: string[];
  keywords: string;
}

export interface MatchReason {
  field: string;
  text: Localized;
}
export interface MatchItem {
  schemeId: string;
  score: number;
  reasons: MatchReason[];
  deadlinePassed: boolean;
  scheme: ResultScheme;
  missingFields?: string[];
  uncertainReasons?: MatchReason[];
}
export interface MatchResponse {
  eligible: MatchItem[];
  possiblyEligible: MatchItem[];
  counts: { eligible: number; possible: number; notEligible: number; total: number };
  limit: number;
}

export interface SearchResponse {
  items: SchemeSummary[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface MetaResponse {
  counts: { total: number; central: number; states: number; byCategory: Record<string, number> };
  categories: Option[];
  beneficiaryTypes: Option[];
  states: Option[];
}

export interface Checklist {
  schemes: { slug: string; name: Localized; officialUrl: string }[];
  documents: { code: string; name: Localized; schemes: { slug: string; name: Localized }[] }[];
}

// ───── admin ─────
export interface AdminUser {
  id: number;
  email: string;
  role: string;
}
export interface AdminSchemeRow extends SchemeSummary {
  ruleCount: number;
  isStale: boolean;
}
export interface AdminSchemeList {
  items: AdminSchemeRow[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  staleDays: number;
}
export interface AdminSchemeQuery {
  q?: string;
  source?: SchemeSource;
  review?: 'pending' | 'done';
  stale?: '1';
  page?: number;
  limit?: number;
}
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
  deadline: string | null;
  lastVerifiedAt?: string;
  isActive?: boolean;
  rules: Rule[];
  documents: string[];
  audience?: 'individual' | 'family' | 'organisation';
  matchable?: boolean;
  needsReview?: boolean;
}
export interface AdminField {
  key: string;
  type: FieldType;
  label: Localized;
  min?: number;
  max?: number;
  options?: Option[];
}
export interface RuleError {
  index: number;
  message: string;
}
export interface Evaluation {
  status: 'eligible' | 'possible' | 'ineligible';
  matchRatio: number;
  reasons: MatchReason[];
  missingFields: string[];
  uncertainReasons: MatchReason[];
}
export interface AdminStats {
  usage: {
    days: number;
    starts: number;
    completions: number;
    completionRate: number;
    schemeViews: number;
    checklistDownloads: number;
    shares: number;
    topSchemes: { slug: string; name: Localized; views: number }[];
    stepCompletions: { step: number; count: number }[];
    daily: { day: string; starts: number; completions: number }[];
  };
  catalogue: {
    total: number;
    active: number;
    stale: number;
    needsReview: number;
    matchable: number;
    curated: number;
    imported: number;
    missingHindi: number;
    staleSchemes: AdminSchemeRow[];
  };
}
