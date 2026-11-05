/**
 * Request validation for admin scheme writes (FR-17, FR-18).
 * Structural checks are done by zod; rule semantics (field exists, operator
 * allowed for its type, value valid) by the engine's `validateRules`.
 */
import { z } from 'zod';
import { STATE_CODES } from '../../engine/states.js';
import { OPERATORS } from '../../engine/types.js';
import { BENEFICIARY_VALUES, CATEGORY_VALUES } from '../schemes/taxonomy.js';

/** English is required for names/summaries; Hindi may be pending (an imported string without a translation). */
const localized = (max = 8000, required = true) =>
  z.object({
    en: required ? z.string().trim().min(1, 'English text is required').max(max) : z.string().trim().max(max),
    hi: z.string().trim().max(max),
  });

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const ruleSchema = z.object({
  groupId: z.number().int().min(1).max(20),
  field: z.string().min(1).max(40),
  operator: z.enum(OPERATORS),
  value: z.union([z.string().max(100), z.number(), z.boolean(), z.array(z.string().max(100)).max(50)]),
});

export const schemeInputSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens').max(80),
  name: localized(200),
  ministry: localized(200),
  state: z
    .string()
    .nullable()
    .refine((s) => s === null || STATE_CODES.has(s), 'Unknown state code'),
  category: z.enum(CATEGORY_VALUES),
  beneficiaryTypes: z.array(z.enum(BENEFICIARY_VALUES)).min(1, 'Pick at least one beneficiary type'),
  summary: localized(300),
  benefits: localized(8000, false),
  eligibility: localized(8000, false),
  howToApply: localized(8000, false),
  officialUrl: z.string().url().max(500).refine((u) => u.startsWith('https://'), 'Official link must use https://'),
  benefitTier: z.number().int().min(1).max(3),
  deadline: isoDate.nullable().optional(),
  lastVerifiedAt: isoDate.optional(),
  isActive: z.boolean().optional(),
  rules: z.array(ruleSchema).max(60),
  documents: z.array(z.string().max(80)).max(60),
  audience: z.enum(['individual', 'family', 'organisation']).optional(),
  matchable: z.boolean().optional(),
  needsReview: z.boolean().optional(),
});

export const statusSchema = z.object({ isActive: z.boolean() });
export const rulesOnlySchema = z.object({ rules: z.array(ruleSchema).max(60) });
