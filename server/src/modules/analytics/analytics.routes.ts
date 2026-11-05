/**
 * POST /api/events — record an anonymous usage event (FR-20).
 * Body: { "type": "scheme_view", "schemeSlug"?: "pm-kisan", "step"?: 3 }
 * Always answers 204 quickly; failures are logged, never shown to users.
 */
import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../../lib/logger.js';
import { EVENT_TYPES, recordEvent } from './analytics.repository.js';

export const analyticsRouter = Router();

const eventSchema = z.object({
  type: z.enum(EVENT_TYPES),
  schemeSlug: z.string().regex(/^[a-z0-9-]{1,80}$/).optional(),
  step: z.number().int().min(1).max(20).optional(),
});

analyticsRouter.post('/', async (req, res) => {
  const event = eventSchema.parse(req.body);
  try {
    await recordEvent(event);
  } catch (err) {
    logger.warn('Failed to record analytics event', { message: (err as Error).message });
  }
  res.status(204).end();
});
