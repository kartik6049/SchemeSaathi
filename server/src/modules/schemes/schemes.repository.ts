/**
 * Data access for schemes, rules and documents. All SQL for the catalogue
 * lives here; services and routes never write SQL directly.
 */
import type pg from 'pg';
import { pool, withTransaction } from '../../db/pool.js';
import { valueTypeOf } from '../../engine/validate.js';
import type { Rule } from '../../engine/types.js';
import { badRequest } from '../../lib/errors.js';
import type { Scheme, SchemeDocument, SchemeInput, SchemeSummary } from './schemes.types.js';

type Queryable = Pick<pg.Pool | pg.PoolClient, 'query'>;

interface SchemeRow {
  id: number;
  slug: string;
  name_en: string; name_hi: string;
  ministry_en: string; ministry_hi: string;
  state: string | null;
  category: string;
  beneficiary_types: string[];
  summary_en: string; summary_hi: string;
  benefits_en: string; benefits_hi: string;
  eligibility_en: string; eligibility_hi: string;
  how_to_apply_en: string; how_to_apply_hi: string;
  official_url: string;
  benefit_tier: number;
  deadline: string | null;
  last_verified_at: string;
  is_active: boolean;
  updated_at: Date;
  source: Scheme['source'];
  audience: Scheme['audience'];
  matchable: boolean;
  needs_review: boolean;
  source_url: string | null;
  import_notes: string[];
  keywords: string;
}

const SUMMARY_COLUMNS = `s.id, s.slug, s.name_en, s.name_hi, s.ministry_en, s.ministry_hi, s.state, s.category,
  s.beneficiary_types, s.summary_en, s.summary_hi, s.benefit_tier, s.deadline, s.last_verified_at, s.is_active,
  s.source, s.needs_review, s.matchable`;

export function toSummary(row: SchemeRow): SchemeSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: { en: row.name_en, hi: row.name_hi },
    ministry: { en: row.ministry_en, hi: row.ministry_hi },
    state: row.state,
    category: row.category,
    beneficiaryTypes: row.beneficiary_types,
    summary: { en: row.summary_en, hi: row.summary_hi },
    benefitTier: row.benefit_tier,
    deadline: row.deadline,
    lastVerifiedAt: row.last_verified_at,
    isActive: row.is_active,
    source: row.source,
    needsReview: row.needs_review,
    matchable: row.matchable,
  };
}

function toScheme(row: SchemeRow, rules: Rule[], documents: SchemeDocument[]): Scheme {
  return {
    ...toSummary(row),
    benefits: { en: row.benefits_en, hi: row.benefits_hi },
    eligibility: { en: row.eligibility_en, hi: row.eligibility_hi },
    howToApply: { en: row.how_to_apply_en, hi: row.how_to_apply_hi },
    officialUrl: row.official_url,
    updatedAt: row.updated_at.toISOString(),
    audience: row.audience,
    sourceUrl: row.source_url,
    importNotes: row.import_notes,
    keywords: row.keywords,
    rules,
    documents,
  };
}

async function loadRules(db: Queryable, schemeIds: number[]): Promise<Map<number, Rule[]>> {
  const map = new Map<number, Rule[]>();
  if (!schemeIds.length) return map;
  const { rows } = await db.query(
    `SELECT scheme_id, group_id, field, operator, value FROM eligibility_rules
     WHERE scheme_id = ANY($1) ORDER BY scheme_id, group_id, id`,
    [schemeIds],
  );
  for (const r of rows) {
    if (!map.has(r.scheme_id)) map.set(r.scheme_id, []);
    map.get(r.scheme_id)!.push({ groupId: r.group_id, field: r.field, operator: r.operator, value: r.value });
  }
  return map;
}

export async function loadDocuments(db: Queryable, schemeIds: number[]): Promise<Map<number, SchemeDocument[]>> {
  const map = new Map<number, SchemeDocument[]>();
  if (!schemeIds.length) return map;
  const { rows } = await db.query(
    `SELECT sd.scheme_id, d.code, d.name_en, d.name_hi FROM scheme_documents sd
     JOIN documents d ON d.id = sd.document_id WHERE sd.scheme_id = ANY($1) ORDER BY d.id`,
    [schemeIds],
  );
  for (const r of rows) {
    if (!map.has(r.scheme_id)) map.set(r.scheme_id, []);
    map.get(r.scheme_id)!.push({ code: r.code, name: { en: r.name_en, hi: r.name_hi } });
  }
  return map;
}

async function hydrate(db: Queryable, rows: SchemeRow[]): Promise<Scheme[]> {
  const ids = rows.map((r) => r.id);
  const [rules, docs] = await Promise.all([loadRules(db, ids), loadDocuments(db, ids)]);
  return rows.map((row) => toScheme(row, rules.get(row.id) ?? [], docs.get(row.id) ?? []));
}

/**
 * Every scheme the matcher should evaluate: active, person-level and with
 * usable rules (cached by the service). Text-heavy columns are skipped and
 * documents aren't needed for matching.
 */
export async function findMatchable(): Promise<Scheme[]> {
  const { rows } = await pool.query<SchemeRow>(
    `SELECT ${SUMMARY_COLUMNS}, '' AS benefits_en, '' AS benefits_hi, '' AS eligibility_en, '' AS eligibility_hi,
       '' AS how_to_apply_en, '' AS how_to_apply_hi, s.official_url, s.updated_at, s.audience, s.source_url, s.import_notes, s.keywords
     FROM schemes s WHERE s.is_active AND s.matchable AND s.audience <> 'organisation' ORDER BY s.name_en`,
  );
  const rules = await loadRules(pool, rows.map((r) => r.id));
  return rows.map((row) => toScheme(row, rules.get(row.id) ?? [], []));
}

export async function findBySlug(slug: string, includeInactive = false): Promise<Scheme | null> {
  const { rows } = await pool.query<SchemeRow>(
    `SELECT * FROM schemes WHERE slug = $1 ${includeInactive ? '' : 'AND is_active'}`,
    [slug],
  );
  return rows[0] ? (await hydrate(pool, rows))[0] : null;
}

export async function findById(id: number, db: Queryable = pool): Promise<Scheme | null> {
  const { rows } = await db.query<SchemeRow>('SELECT * FROM schemes WHERE id = $1', [id]);
  return rows[0] ? (await hydrate(db, rows))[0] : null;
}

export async function findBySlugs(slugs: string[]): Promise<Scheme[]> {
  const { rows } = await pool.query<SchemeRow>('SELECT * FROM schemes WHERE slug = ANY($1) AND is_active', [slugs]);
  return hydrate(pool, rows);
}

export interface SearchParams {
  q?: string;
  category?: string;
  state?: string;
  beneficiary?: string;
  page: number;
  limit: number;
  includeInactive?: boolean;
  /** Admin filters */
  source?: string;
  review?: 'pending' | 'done';
  stale?: number;
}

/**
 * Turns free text into a safe prefix tsquery: "kisan pen" -> "kisan:* & pen:*".
 * Keeps letters, digits and combining marks (needed for Devanagari matras).
 */
export function toPrefixQuery(q: string): string | null {
  const tokens = q.toLowerCase().match(/[\p{L}\p{N}\p{M}]+/gu) ?? [];
  return tokens.length ? tokens.slice(0, 8).map((t) => `${t}:*`).join(' & ') : null;
}

export async function search(p: SearchParams): Promise<{ items: SchemeSummary[]; total: number }> {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    where.push(sql.replace('?', `$${params.length}`));
  };

  if (!p.includeInactive) where.push('s.is_active');
  const tsq = p.q ? toPrefixQuery(p.q) : null;
  if (tsq) add(`s.search @@ to_tsquery('simple', ?)`, tsq);
  if (p.category) add('s.category = ?', p.category);
  // A state filter shows that state's schemes plus all central schemes.
  if (p.state) add('(s.state IS NULL OR s.state = ?)', p.state);
  if (p.beneficiary) add('? = ANY(s.beneficiary_types)', p.beneficiary);
  if (p.source) add('s.source = ?', p.source);
  if (p.review === 'pending') where.push('s.needs_review');
  if (p.review === 'done') where.push('NOT s.needs_review');
  if (p.stale) add('s.last_verified_at < CURRENT_DATE - ?::int', p.stale);

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  // Curated (hand-verified) schemes first, then reviewed imports, then the rest.
  let orderSql = `ORDER BY (s.source <> 'myscheme') DESC, s.needs_review, s.name_en`;
  if (tsq) {
    params.push(tsq);
    orderSql = `ORDER BY ts_rank(s.search, to_tsquery('simple', $${params.length})) * CASE WHEN s.source = 'myscheme' THEN 1 ELSE 1.5 END DESC, s.name_en`;
  }
  params.push(p.limit, (p.page - 1) * p.limit);

  const { rows } = await pool.query<SchemeRow & { total: string; is_stale: boolean; rule_count: string }>(
    `SELECT ${SUMMARY_COLUMNS}, COUNT(*) OVER() AS total,
       (s.last_verified_at < CURRENT_DATE - 180) AS is_stale,
       (SELECT COUNT(*) FROM eligibility_rules r WHERE r.scheme_id = s.id) AS rule_count
     FROM schemes s ${whereSql} ${orderSql}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return {
    items: rows.map((r) => (p.includeInactive ? { ...toSummary(r), isStale: r.is_stale, ruleCount: Number(r.rule_count) } : toSummary(r))),
    total: rows[0] ? Number(rows[0].total) : 0,
  };
}

// ───────────── writes ─────────────

async function writeChildren(client: pg.PoolClient, schemeId: number, input: SchemeInput) {
  await client.query('DELETE FROM eligibility_rules WHERE scheme_id = $1', [schemeId]);
  await client.query('DELETE FROM scheme_documents WHERE scheme_id = $1', [schemeId]);

  for (const rule of input.rules) {
    await client.query(
      `INSERT INTO eligibility_rules (scheme_id, group_id, field, operator, value, value_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [schemeId, rule.groupId, rule.field, rule.operator, JSON.stringify(rule.value), valueTypeOf(rule.value)],
    );
  }

  if (input.documents.length) {
    const { rows } = await client.query<{ id: number; code: string }>('SELECT id, code FROM documents WHERE code = ANY($1)', [input.documents]);
    const unknown = input.documents.filter((c) => !rows.some((r) => r.code === c));
    if (unknown.length) throw badRequest(`Unknown document code(s): ${unknown.join(', ')}`);
    for (const row of rows) {
      await client.query('INSERT INTO scheme_documents (scheme_id, document_id) VALUES ($1, $2)', [schemeId, row.id]);
    }
  }
}

function columnValues(i: SchemeInput) {
  return [
    i.slug, i.name.en, i.name.hi, i.ministry.en, i.ministry.hi, i.state, i.category, i.beneficiaryTypes,
    i.summary.en, i.summary.hi, i.benefits.en, i.benefits.hi, i.eligibility.en, i.eligibility.hi,
    i.howToApply.en, i.howToApply.hi, i.officialUrl, i.benefitTier, i.deadline ?? null,
    i.lastVerifiedAt ?? new Date().toISOString().slice(0, 10), i.isActive ?? true,
    i.source ?? 'admin', i.audience ?? 'individual', i.matchable ?? true, i.needsReview ?? false,
    i.sourceUrl ?? null, i.keywords ?? '', i.importNotes ?? [],
  ];
}

const COLUMNS = `slug, name_en, name_hi, ministry_en, ministry_hi, state, category, beneficiary_types,
  summary_en, summary_hi, benefits_en, benefits_hi, eligibility_en, eligibility_hi,
  how_to_apply_en, how_to_apply_hi, official_url, benefit_tier, deadline, last_verified_at, is_active,
  source, audience, matchable, needs_review, source_url, keywords, import_notes`;
const COLUMN_COUNT = COLUMNS.split(',').length;

/** Pass `{ returning: false }` in bulk imports to skip re-reading the saved row. */
export async function create(input: SchemeInput, db?: pg.PoolClient, { returning = true } = {}): Promise<Scheme> {
  const run = async (client: pg.PoolClient) => {
    const placeholders = Array.from({ length: COLUMN_COUNT }, (_, i) => `$${i + 1}`).join(', ');
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO schemes (${COLUMNS}) VALUES (${placeholders}) RETURNING id`,
      columnValues(input),
    );
    await writeChildren(client, rows[0].id, input);
    return returning ? (await findById(rows[0].id, client))! : ({ id: rows[0].id } as Scheme);
  };
  return db ? run(db) : withTransaction(run);
}

export async function update(id: number, input: SchemeInput, db?: pg.PoolClient, { returning = true } = {}): Promise<Scheme | null> {
  const run = async (client: pg.PoolClient) => {
    const sets = COLUMNS.split(',').map((c, i) => `${c.trim()} = $${i + 1}`).join(', ');
    const { rowCount } = await client.query(
      `UPDATE schemes SET ${sets}, updated_at = now() WHERE id = $${COLUMN_COUNT + 1}`,
      [...columnValues(input), id],
    );
    if (!rowCount) return null;
    await writeChildren(client, id, input);
    return returning ? findById(id, client) : ({ id } as Scheme);
  };
  return db ? run(db) : withTransaction(run);
}

export async function setActive(id: number, isActive: boolean): Promise<boolean> {
  const { rowCount } = await pool.query('UPDATE schemes SET is_active = $1, updated_at = now() WHERE id = $2', [isActive, id]);
  return Boolean(rowCount);
}

export async function markVerified(id: number): Promise<boolean> {
  const { rowCount } = await pool.query('UPDATE schemes SET last_verified_at = CURRENT_DATE, updated_at = now() WHERE id = $1', [id]);
  return Boolean(rowCount);
}

export async function listDocuments(): Promise<SchemeDocument[]> {
  const { rows } = await pool.query('SELECT code, name_en, name_hi FROM documents ORDER BY id');
  return rows.map((r) => ({ code: r.code, name: { en: r.name_en, hi: r.name_hi } }));
}

/** Headline catalogue numbers for the admin dashboard. */
export async function catalogueStats(staleDays: number) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE is_active)::int AS active,
       COUNT(*) FILTER (WHERE is_active AND last_verified_at < CURRENT_DATE - $1::int)::int AS stale,
       COUNT(*) FILTER (WHERE needs_review)::int AS needs_review,
       COUNT(*) FILTER (WHERE is_active AND matchable AND audience <> 'organisation')::int AS matchable,
       COUNT(*) FILTER (WHERE source = 'curated')::int AS curated,
       COUNT(*) FILTER (WHERE source = 'myscheme')::int AS imported,
       COUNT(*) FILTER (WHERE name_hi = '')::int AS missing_hindi
     FROM schemes`,
    [staleDays],
  );
  const r = rows[0];
  return {
    total: r.total, active: r.active, stale: r.stale, needsReview: r.needs_review, matchable: r.matchable,
    curated: r.curated, imported: r.imported, missingHindi: r.missing_hindi,
  };
}

/** Public catalogue counts for the home page and filters. */
export async function publicCounts() {
  const [cats, totals] = await Promise.all([
    pool.query<{ category: string; count: number }>(
      'SELECT category, COUNT(*)::int AS count FROM schemes WHERE is_active GROUP BY category ORDER BY count DESC',
    ),
    pool.query<{ total: number; central: number; states: number }>(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE state IS NULL)::int AS central,
         COUNT(DISTINCT state)::int AS states FROM schemes WHERE is_active`,
    ),
  ]);
  return { byCategory: Object.fromEntries(cats.rows.map((r) => [r.category, r.count])), ...totals.rows[0] };
}
