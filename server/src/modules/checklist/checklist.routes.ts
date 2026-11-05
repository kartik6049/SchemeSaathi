/**
 * Checklist endpoints (FR-10).
 *   POST /api/checklist          -> JSON checklist (shown on screen)
 *   POST /api/checklist/pdf      -> downloadable PDF in the chosen language
 * Body: { "schemeIds": ["pm-kisan", ...], "lang": "en" | "hi" }
 */
import { Router } from 'express';
import { z } from 'zod';
import { buildChecklist } from './checklist.service.js';
import { renderChecklistPdf } from './pdf.js';

export const checklistRouter = Router();

const body = z.object({
  schemeIds: z.array(z.string().regex(/^[a-z0-9-]{1,80}$/)).min(1).max(50),
  lang: z.enum(['en', 'hi']).default('en'),
});

checklistRouter.post('/', async (req, res) => {
  const { schemeIds } = body.parse(req.body);
  res.json(await buildChecklist(schemeIds));
});

checklistRouter.post('/pdf', async (req, res) => {
  const { schemeIds, lang } = body.parse(req.body);
  const checklist = await buildChecklist(schemeIds);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="schemesaathi-checklist-${lang}.pdf"`);
  res.setHeader('Cache-Control', 'no-store');
  renderChecklistPdf(checklist, lang).pipe(res);
});
