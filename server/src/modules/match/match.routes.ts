/**
 * POST /api/match — classify all schemes for a profile.
 * Body: profile answers (see match.schema.ts). Query: `?limit=30` (max 500).
 * Response: { eligible: [...], possiblyEligible: [...], counts: {...}, limit }
 * Responses are marked no-store: they're derived from personal answers.
 */
import { Router } from 'express';
import { z } from 'zod';
import { profileSchema } from './match.schema.js';
import { matchProfile } from './match.service.js';

export const matchRouter = Router();

matchRouter.post('/', async (req, res) => {
  const profile = profileSchema.parse(req.body ?? {});
  const { limit } = z.object({ limit: z.coerce.number().int().min(1).max(500).default(30) }).parse(req.query);
  const result = await matchProfile(profile, { limit });
  res.set('Cache-Control', 'no-store').json(result);
});
