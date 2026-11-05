/**
 * Anonymous analytics storage and aggregation (FR-20).
 * Events carry only a type, an optional scheme slug and an optional step
 * number — never IPs, user agents or answers (NFR-07).
 */
import { pool } from '../../db/pool.js';

export const EVENT_TYPES = [
  'questionnaire_start',
  'step_complete',
  'questionnaire_complete',
  'scheme_view',
  'checklist_download',
  'share',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export async function recordEvent(e: { type: EventType; schemeSlug?: string; step?: number }) {
  await pool.query('INSERT INTO analytics_events (event_type, scheme_slug, step) VALUES ($1, $2, $3)', [
    e.type,
    e.schemeSlug ?? null,
    e.step ?? null,
  ]);
}

export async function getStats(days = 30) {
  const since = `now() - ($1::int * interval '1 day')`;
  const [totals, topSchemes, steps, daily] = await Promise.all([
    pool.query(`SELECT event_type, COUNT(*)::int AS count FROM analytics_events WHERE created_at > ${since} GROUP BY event_type`, [days]),
    pool.query(
      `SELECT e.scheme_slug AS slug, s.name_en, s.name_hi, COUNT(*)::int AS views
       FROM analytics_events e LEFT JOIN schemes s ON s.slug = e.scheme_slug
       WHERE e.event_type = 'scheme_view' AND e.created_at > ${since}
       GROUP BY e.scheme_slug, s.name_en, s.name_hi ORDER BY views DESC LIMIT 10`,
      [days],
    ),
    pool.query(
      `SELECT step, COUNT(*)::int AS count FROM analytics_events
       WHERE event_type = 'step_complete' AND created_at > ${since} AND step IS NOT NULL GROUP BY step ORDER BY step`,
      [days],
    ),
    pool.query(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
         COUNT(*) FILTER (WHERE event_type = 'questionnaire_start')::int AS starts,
         COUNT(*) FILTER (WHERE event_type = 'questionnaire_complete')::int AS completions
       FROM analytics_events WHERE created_at > ${since} GROUP BY 1 ORDER BY 1`,
      [days],
    ),
  ]);

  const count = (t: EventType) => totals.rows.find((r) => r.event_type === t)?.count ?? 0;
  const starts = count('questionnaire_start');
  const completions = count('questionnaire_complete');
  return {
    days,
    starts,
    completions,
    completionRate: starts ? Math.round((completions / starts) * 100) : 0,
    schemeViews: count('scheme_view'),
    checklistDownloads: count('checklist_download'),
    shares: count('share'),
    topSchemes: topSchemes.rows.map((r) => ({ slug: r.slug, name: { en: r.name_en ?? r.slug, hi: r.name_hi ?? r.slug }, views: r.views })),
    stepCompletions: steps.rows,
    daily: daily.rows,
  };
}
