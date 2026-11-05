/**
 * GET /api/questions — the questionnaire definition (FR-01).
 * Returned straight from the field registry, grouped into steps of ≤ 2
 * questions, so the frontend never hard-codes questions. `showIf` tells the
 * client when a question is relevant (e.g. pregnancy only for women 15–50).
 */
import { Router } from 'express';
import { FIELDS, TOTAL_STEPS } from '../../engine/fields.js';

export const questionsRouter = Router();

questionsRouter.get('/', (_req, res) => {
  const steps = Array.from({ length: TOTAL_STEPS }, (_, i) => ({
    step: i + 1,
    fields: FIELDS.filter((f) => f.step === i + 1).map(({ key, type, label, help, required, options, min, max, showIf }) => ({
      key,
      type,
      label,
      help,
      required,
      min,
      max,
      showIf,
      options: options?.map(({ value, label: optionLabel }) => ({ value, label: optionLabel })),
    })),
  }));
  res.set('Cache-Control', 'public, max-age=300').json({ steps, totalSteps: TOTAL_STEPS });
});
