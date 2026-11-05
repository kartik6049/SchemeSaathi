/**
 * Integration tests for public endpoints against a real Postgres test DB.
 * Covers E2E-like API flows, IT-PDF-01 and IT-PRIV-01 (no profile storage).
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { pool, resetDb } from '../helpers/testDb.js';

const app = createApp();

beforeAll(resetDb);
afterAll(() => pool.end());

describe('GET /api/health', () => {
  it('reports db up', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'up' });
  });
});

describe('GET /api/questions', () => {
  it('returns steps with at most 2 questions each, bilingual labels', async () => {
    const res = await request(app).get('/api/questions');
    expect(res.status).toBe(200);
    expect(res.body.totalSteps).toBe(res.body.steps.length);
    for (const step of res.body.steps) {
      expect(step.fields.length).toBeGreaterThan(0);
      expect(step.fields.length).toBeLessThanOrEqual(2);
      for (const f of step.fields) expect(f.label).toEqual({ en: expect.any(String), hi: expect.any(String) });
    }
    // range bounds are internal and must not leak into the public contract
    const income = res.body.steps.flatMap((s: { fields: unknown[] }) => s.fields).find((f: { key: string }) => f.key === 'incomeRange');
    expect(income.options[0]).not.toHaveProperty('bounds');
  });
});

describe('POST /api/match', () => {
  const srsSample = {
    state: 'UP', age: 62, gender: 'female', incomeRange: 'below_1L', occupation: 'farmer',
    category: 'obc', disability: false, student: false,
  };

  it('matches the SRS sample profile (contract shape)', async () => {
    const res = await request(app).post('/api/match').send(srsSample);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    const kisan = res.body.eligible.find((e: { schemeId: string }) => e.schemeId === 'pm-kisan');
    expect(kisan).toMatchObject({ score: expect.any(Number), reasons: [{ field: 'occupation', text: { en: 'Occupation: Farmer' } }] });
    const upPension = res.body.possiblyEligible.find((e: { schemeId: string }) => e.schemeId === 'up-old-age-pension');
    expect(upPension.missingFields).toContain('bplCard');
    expect(res.body.counts.total).toBe(45);
    expect(res.body.counts.eligible + res.body.counts.possible + res.body.counts.notEligible).toBe(45);
  });

  it('ranks eligible results by descending score', async () => {
    const res = await request(app).post('/api/match').send(srsSample);
    const scores = res.body.eligible.map((e: { score: number }) => e.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it('accepts an empty profile (everything becomes "possible")', async () => {
    const res = await request(app).post('/api/match').send({});
    expect(res.status).toBe(200);
    expect(res.body.counts.notEligible).toBe(0);
  });

  it('treats null as skipped and ignores unknown keys', async () => {
    const res = await request(app).post('/api/match').send({ age: null, aadhaar: '1234-5678-9012' });
    expect(res.status).toBe(200);
  });

  it.each([
    [{ age: -1 }],
    [{ age: 'sixty' }],
    [{ gender: 'robot' }],
    [{ incomeRange: '10_crore' }],
    [{ disability: 'yes' }],
  ])('rejects invalid input %j with 400', async (body) => {
    const res = await request(app).post('/api/match').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects malformed JSON', async () => {
    const res = await request(app).post('/api/match').set('content-type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_JSON');
  });

  it('IT-PRIV-01: does not persist anything about the profile', async () => {
    const counts = async () =>
      (await pool.query(`SELECT (SELECT COUNT(*) FROM analytics_events) a, (SELECT COUNT(*) FROM schemes) s, (SELECT COUNT(*) FROM admin_users) u`)).rows[0];
    const before = await counts();
    await request(app).post('/api/match').send(srsSample);
    expect(await counts()).toEqual(before);
  });
});

describe('GET /api/schemes', () => {
  it('lists active schemes with pagination', async () => {
    const res = await request(app).get('/api/schemes?limit=10&page=2');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 45, page: 2, limit: 10, pages: 5 });
    expect(res.body.items).toHaveLength(10);
  });

  it('searches in English with prefix matching', async () => {
    const res = await request(app).get('/api/schemes').query({ q: 'scholar' });
    expect(res.body.total).toBeGreaterThan(5);
    expect(res.body.items.every((i: { category: string }) => i.category === 'education')).toBe(true);
  });

  it('searches in Hindi', async () => {
    const res = await request(app).get('/api/schemes').query({ q: 'पेंशन' });
    expect(res.body.items.map((i: { slug: string }) => i.slug)).toContain('old-age-pension-ignoaps');
  });

  it('ignores special characters in search safely', async () => {
    const res = await request(app).get('/api/schemes').query({ q: "'); DROP TABLE schemes; --" });
    expect(res.status).toBe(200);
  });

  it('filters by category, state and beneficiary type', async () => {
    const agri = await request(app).get('/api/schemes?category=agriculture');
    expect(agri.body.items.every((i: { category: string }) => i.category === 'agriculture')).toBe(true);

    const mh = await request(app).get('/api/schemes?state=MH&limit=100');
    const states = new Set(mh.body.items.map((i: { state: string | null }) => i.state));
    expect([...states].sort()).toEqual(['MH', null].sort());

    const women = await request(app).get('/api/schemes?beneficiary=women&limit=100');
    expect(women.body.items.every((i: { beneficiaryTypes: string[] }) => i.beneficiaryTypes.includes('women'))).toBe(true);
  });

  it('returns filter metadata', async () => {
    const res = await request(app).get('/api/schemes/meta');
    expect(res.body.categories.length).toBeGreaterThan(5);
    expect(res.body.states).toContainEqual({ value: 'UP', label: { en: 'Uttar Pradesh', hi: 'उत्तर प्रदेश' } });
  });
});

describe('GET /api/schemes/:slug', () => {
  it('returns the full detail page data (FR-09)', async () => {
    const res = await request(app).get('/api/schemes/pm-kisan');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      slug: 'pm-kisan',
      officialUrl: 'https://pmkisan.gov.in',
      lastVerifiedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      rules: [{ field: 'occupation', operator: '=', value: 'farmer', groupId: 1 }],
    });
    expect(res.body.documents.map((d: { code: string }) => d.code)).toContain('land_records');
    for (const key of ['name', 'ministry', 'benefits', 'eligibility', 'howToApply']) {
      expect(res.body[key]).toEqual({ en: expect.any(String), hi: expect.any(String) });
    }
  });

  it('404s for unknown schemes', async () => {
    const res = await request(app).get('/api/schemes/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('POST /api/checklist (IT-PDF-01)', () => {
  const body = { schemeIds: ['pm-kisan', 'pm-fasal-bima-yojana', 'old-age-pension-ignoaps'] };

  it('de-duplicates documents across schemes', async () => {
    const res = await request(app).post('/api/checklist').send(body);
    expect(res.status).toBe(200);
    const codes = res.body.documents.map((d: { code: string }) => d.code);
    expect(new Set(codes).size).toBe(codes.length);
    const aadhaar = res.body.documents.find((d: { code: string }) => d.code === 'aadhaar');
    expect(aadhaar.schemes).toHaveLength(3);
    expect(res.body.documents[0].code).toBe('aadhaar'); // most-needed first
  });

  it.each(['en', 'hi'])('renders a PDF in %s', async (lang) => {
    const res = await request(app)
      .post('/api/checklist/pdf')
      .send({ ...body, lang })
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain(`checklist-${lang}.pdf`);
    expect((res.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('validates input', async () => {
    expect((await request(app).post('/api/checklist').send({ schemeIds: [] })).status).toBe(400);
    expect((await request(app).post('/api/checklist').send({ schemeIds: ['../etc'] })).status).toBe(400);
    expect((await request(app).post('/api/checklist').send({ schemeIds: ['nope'] })).status).toBe(404);
  });
});

describe('POST /api/events', () => {
  it('stores anonymous events', async () => {
    const res = await request(app).post('/api/events').send({ type: 'scheme_view', schemeSlug: 'pm-kisan' });
    expect(res.status).toBe(204);
    const { rows } = await pool.query(`SELECT * FROM analytics_events WHERE scheme_slug = 'pm-kisan'`);
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual(['created_at', 'event_type', 'id', 'scheme_slug', 'step']);
  });

  it('rejects unknown event types', async () => {
    expect((await request(app).post('/api/events').send({ type: 'track_user' })).status).toBe(400);
  });
});

describe('security headers & unknown routes', () => {
  it('sets helmet headers and hides the framework', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('returns JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
