/**
 * Public scheme catalogue (FR-09, FR-11).
 *   GET /api/schemes            search + filter + paginate
 *   GET /api/schemes/meta       filter options (categories, beneficiary types, states) + counts
 *   GET /api/schemes/:slug      full scheme detail
 */
import { Router } from 'express';
import { z } from 'zod';
import { STATES } from '../../engine/states.js';
import { notFound } from '../../lib/errors.js';
import * as repo from './schemes.repository.js';
import { BENEFICIARY_TYPES, CATEGORIES } from './taxonomy.js';

export const schemesRouter = Router();

const searchQuery = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().max(40).optional(),
  state: z.string().max(4).optional(),
  beneficiary: z.string().max(40).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

schemesRouter.get('/', async (req, res) => {
  const params = searchQuery.parse(req.query);
  const { items, total } = await repo.search(params);
  res.json({ items, total, page: params.page, limit: params.limit, pages: Math.ceil(total / params.limit) });
});

let countsCache: { at: number; value: Awaited<ReturnType<typeof repo.publicCounts>> } | null = null;

schemesRouter.get('/meta', async (_req, res) => {
  if (!countsCache || Date.now() - countsCache.at > 300_000) countsCache = { at: Date.now(), value: await repo.publicCounts() };
  res.set('Cache-Control', 'public, max-age=300').json({
    counts: countsCache.value,
    categories: CATEGORIES,
    beneficiaryTypes: BENEFICIARY_TYPES,
    states: STATES.map((s) => ({ value: s.code, label: s.name })),
  });
});

schemesRouter.get('/:slug', async (req, res) => {
  const scheme = await repo.findBySlug(req.params.slug);
  if (!scheme) throw notFound('Scheme');
  res.json(scheme);
});
