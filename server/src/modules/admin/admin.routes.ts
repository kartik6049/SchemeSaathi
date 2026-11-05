/**
 * Admin API (all routes require an admin session).
 *   GET    /api/admin/schemes                search/paginate all schemes (?q&source&review&stale&page&limit)
 *   GET    /api/admin/schemes/:id            full scheme for editing
 *   POST   /api/admin/schemes                create
 *   PUT    /api/admin/schemes/:id            update (replaces rules & documents)
 *   PATCH  /api/admin/schemes/:id/status     activate / deactivate
 *   POST   /api/admin/schemes/:id/verify     set last-verified date to today
 *   POST   /api/admin/rules/validate         validate rules without saving (FR-18)
 *   POST   /api/admin/preview                evaluate draft rules against a sample profile
 *   GET    /api/admin/documents              document catalogue for the editor
 *   GET    /api/admin/fields                 rule-builder metadata (fields/operators)
 *   GET    /api/admin/stats                  dashboard numbers (FR-19, FR-20)
 * Every write invalidates the matcher cache so changes are live immediately.
 */
import { Router } from 'express';
import { z } from 'zod';
import { evaluateScheme, FIELDS, OPERATORS, validateRules } from '../../engine/index.js';
import { AppError, notFound } from '../../lib/errors.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import { getStats } from '../analytics/analytics.repository.js';
import { profileSchema } from '../match/match.schema.js';
import * as repo from '../schemes/schemes.repository.js';
import { invalidateSchemeCache } from '../schemes/schemes.service.js';
import { rulesOnlySchema, ruleSchema, schemeInputSchema, statusSchema } from './admin.schemas.js';

export const STALE_DAYS = 180;

const idParam = z.coerce.number().int().positive();

function assertValidRules(rules: unknown[]) {
  const errors = validateRules(rules as never[]);
  if (errors.length) throw new AppError(422, 'INVALID_RULES', 'Some eligibility rules are invalid', errors);
}

export const adminRouter = Router();
adminRouter.use(requireAdmin);

const adminSearch = z.object({
  q: z.string().trim().max(100).optional(),
  source: z.enum(['curated', 'myscheme', 'admin']).optional(),
  review: z.enum(['pending', 'done']).optional(),
  stale: z.literal('1').optional(),
  category: z.string().max(40).optional(),
  state: z.string().max(4).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

adminRouter.get('/schemes', async (req, res) => {
  const p = adminSearch.parse(req.query);
  const { items, total } = await repo.search({ ...p, stale: p.stale ? STALE_DAYS : undefined, includeInactive: true });
  res.json({ items, total, page: p.page, limit: p.limit, pages: Math.ceil(total / p.limit), staleDays: STALE_DAYS });
});

adminRouter.get('/schemes/:id', async (req, res) => {
  const scheme = await repo.findById(idParam.parse(req.params.id));
  if (!scheme) throw notFound('Scheme');
  res.json(scheme);
});

adminRouter.post('/schemes', async (req, res) => {
  const input = schemeInputSchema.parse(req.body);
  assertValidRules(input.rules);
  const scheme = await repo.create({ ...input, source: 'admin' });
  invalidateSchemeCache();
  res.status(201).json(scheme);
});

adminRouter.put('/schemes/:id', async (req, res) => {
  const input = schemeInputSchema.parse(req.body);
  assertValidRules(input.rules);
  const id = idParam.parse(req.params.id);
  const existing = await repo.findById(id);
  if (!existing) throw notFound('Scheme');
  // Keep import provenance; edits don't change where a scheme came from.
  const scheme = await repo.update(id, {
    ...input,
    source: existing.source,
    sourceUrl: existing.sourceUrl,
    importNotes: existing.importNotes,
    keywords: existing.keywords,
    audience: input.audience ?? existing.audience,
    matchable: input.matchable ?? existing.matchable,
    needsReview: input.needsReview ?? existing.needsReview,
  });
  if (!scheme) throw notFound('Scheme');
  invalidateSchemeCache();
  res.json(scheme);
});

adminRouter.patch('/schemes/:id/status', async (req, res) => {
  const { isActive } = statusSchema.parse(req.body);
  if (!(await repo.setActive(idParam.parse(req.params.id), isActive))) throw notFound('Scheme');
  invalidateSchemeCache();
  res.json({ isActive });
});

adminRouter.post('/schemes/:id/verify', async (req, res) => {
  if (!(await repo.markVerified(idParam.parse(req.params.id)))) throw notFound('Scheme');
  invalidateSchemeCache();
  res.json({ lastVerifiedAt: new Date().toISOString().slice(0, 10) });
});

adminRouter.post('/rules/validate', (req, res) => {
  const { rules } = rulesOnlySchema.parse(req.body);
  const errors = validateRules(rules);
  res.json({ valid: errors.length === 0, errors });
});

const previewSchema = z.object({
  state: z.string().nullable().default(null),
  rules: z.array(ruleSchema).max(60),
  profile: z.unknown(),
});

adminRouter.post('/preview', (req, res) => {
  const { state, rules, profile } = previewSchema.parse(req.body);
  assertValidRules(rules);
  const evaluation = evaluateScheme(
    { slug: 'preview', state, benefitTier: 2, deadline: null, rules },
    profileSchema.parse(profile ?? {}),
  );
  res.json(evaluation);
});

adminRouter.get('/documents', async (_req, res) => {
  res.json({ items: await repo.listDocuments() });
});

adminRouter.get('/fields', (_req, res) => {
  res.json({
    operators: OPERATORS,
    fields: FIELDS.map(({ key, type, noun, options, min, max }) => ({
      key, type, label: noun, min, max, options: options?.map((o) => ({ value: o.value, label: o.label })),
    })),
  });
});

adminRouter.get('/stats', async (_req, res) => {
  const [usage, catalogue, stale] = await Promise.all([
    getStats(30),
    repo.catalogueStats(STALE_DAYS),
    repo.search({ includeInactive: false, source: 'curated', stale: STALE_DAYS, page: 1, limit: 10 }),
  ]);
  // Stale list shows hand-curated schemes first: they're the ones admins actively maintain.
  res.json({ usage, catalogue: { ...catalogue, staleSchemes: stale.items } });
});
