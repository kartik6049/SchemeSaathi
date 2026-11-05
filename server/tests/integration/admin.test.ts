/**
 * Integration tests for the admin API: auth (IT-ADMIN-*), CRUD, rule
 * validation, and that admin changes show up in matching without redeploy
 * (IT-ADMIN-02 / FR-06).
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { pool, resetDb } from '../helpers/testDb.js';

const app = createApp();
let cookie: string;

const newScheme = {
  slug: 'test-fisher-support',
  name: { en: 'Test Fisher Support', hi: 'परीक्षण मछुआरा सहायता' },
  ministry: { en: 'Test Ministry', hi: 'परीक्षण मंत्रालय' },
  state: 'KL',
  category: 'agriculture',
  beneficiaryTypes: ['farmer'],
  summary: { en: 'Support for test fishers', hi: 'परीक्षण मछुआरों हेतु सहायता' },
  benefits: { en: '₹1,000', hi: '₹1,000' },
  eligibility: { en: 'Age 18+', hi: 'आयु 18+' },
  howToApply: { en: 'Apply online', hi: 'ऑनलाइन आवेदन करें' },
  officialUrl: 'https://example.gov.in',
  benefitTier: 2,
  deadline: null,
  rules: [{ groupId: 1, field: 'age', operator: '>=', value: 18 }],
  documents: ['aadhaar', 'bank_passbook'],
};

beforeAll(async () => {
  await resetDb();
  const res = await request(app).post('/api/admin/auth/login').send({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD });
  cookie = res.headers['set-cookie'][0];
});
afterAll(() => pool.end());

describe('admin auth (FR-16)', () => {
  it('rejects wrong credentials with a generic message', async () => {
    const wrongPass = await request(app).post('/api/admin/auth/login').send({ email: env.ADMIN_EMAIL, password: 'nope' });
    const wrongUser = await request(app).post('/api/admin/auth/login').send({ email: 'ghost@x.io', password: 'nope' });
    expect(wrongPass.status).toBe(401);
    expect(wrongUser.status).toBe(401);
    expect(wrongPass.body.error.message).toBe(wrongUser.body.error.message);
  });

  it('sets an httpOnly SameSite=Strict cookie on success', () => {
    expect(cookie).toMatch(/^ss_admin=/);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/api');
  });

  it('stores passwords hashed with bcrypt', async () => {
    const { rows } = await pool.query('SELECT password_hash FROM admin_users');
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('protects admin routes', async () => {
    expect((await request(app).get('/api/admin/schemes')).status).toBe(401);
    expect((await request(app).get('/api/admin/schemes').set('Cookie', 'ss_admin=forged.token.value')).status).toBe(401);
  });

  it('returns the current admin', async () => {
    const res = await request(app).get('/api/admin/auth/me').set('Cookie', cookie);
    expect(res.body.admin.email).toBe(env.ADMIN_EMAIL);
  });
});

describe('admin scheme management (FR-17, FR-18, FR-19)', () => {
  let id: number;

  it('lists schemes with stale flags, paginated and searchable', async () => {
    const res = await request(app).get('/api/admin/schemes').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 45, page: 1, limit: 50 });
    expect(res.body.items.some((s: { isStale: boolean }) => s.isStale)).toBe(true);
    const page2 = await request(app).get('/api/admin/schemes?limit=20&page=3').set('Cookie', cookie);
    expect(page2.body.items).toHaveLength(5);
    const stale = await request(app).get('/api/admin/schemes?stale=1').set('Cookie', cookie);
    expect(stale.body.items.every((s: { isStale: boolean }) => s.isStale)).toBe(true);
    const q = await request(app).get('/api/admin/schemes?q=kisan').set('Cookie', cookie);
    expect(q.body.items.map((s: { slug: string }) => s.slug)).toContain('pm-kisan');
  });

  it('blocks publishing a scheme with invalid rules (UC-03 alt flow 4a)', async () => {
    const res = await request(app)
      .post('/api/admin/schemes')
      .set('Cookie', cookie)
      .send({ ...newScheme, rules: [{ groupId: 1, field: 'age', operator: 'in', value: 18 }] });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_RULES');
    expect(res.body.error.details[0]).toMatchObject({ index: 0 });
  });

  it('validates structure (missing English name, http link); Hindi may be pending', async () => {
    const res = await request(app)
      .post('/api/admin/schemes')
      .set('Cookie', cookie)
      .send({ ...newScheme, name: { en: '', hi: 'नाम' }, officialUrl: 'http://insecure.example' });
    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['name.en', 'officialUrl']));
  });

  it('rejects unknown document codes', async () => {
    const res = await request(app).post('/api/admin/schemes').set('Cookie', cookie).send({ ...newScheme, slug: 'tmp-doc', documents: ['passport'] });
    expect(res.status).toBe(400);
    const exists = await pool.query(`SELECT 1 FROM schemes WHERE slug = 'tmp-doc'`);
    expect(exists.rowCount).toBe(0); // transaction rolled back
  });

  it('creates a scheme that immediately appears in match results (IT-ADMIN-02)', async () => {
    const res = await request(app).post('/api/admin/schemes').set('Cookie', cookie).send(newScheme);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ source: 'admin', needsReview: false, matchable: true });
    id = res.body.id;
    expect(res.body.documents.map((d: { code: string }) => d.code)).toEqual(['aadhaar', 'bank_passbook']);

    const match = await request(app).post('/api/match').send({ state: 'KL', age: 30 });
    expect(match.body.eligible.map((e: { schemeId: string }) => e.schemeId)).toContain('test-fisher-support');
  });

  it('rejects duplicate slugs with 409', async () => {
    const res = await request(app).post('/api/admin/schemes').set('Cookie', cookie).send(newScheme);
    expect(res.status).toBe(409);
  });

  it('updates rules and the matcher sees the change', async () => {
    const res = await request(app)
      .put(`/api/admin/schemes/${id}`)
      .set('Cookie', cookie)
      .send({ ...newScheme, rules: [{ groupId: 1, field: 'age', operator: '>=', value: 60 }] });
    expect(res.status).toBe(200);
    const match = await request(app).post('/api/match').send({ state: 'KL', age: 30 });
    expect(match.body.eligible.map((e: { schemeId: string }) => e.schemeId)).not.toContain('test-fisher-support');
  });

  it('deactivates and hides the scheme from the public', async () => {
    const res = await request(app).patch(`/api/admin/schemes/${id}/status`).set('Cookie', cookie).send({ isActive: false });
    expect(res.status).toBe(200);
    expect((await request(app).get('/api/schemes/test-fisher-support')).status).toBe(404);
  });

  it('marks a scheme verified today', async () => {
    const res = await request(app).post(`/api/admin/schemes/${id}/verify`).set('Cookie', cookie);
    expect(res.body.lastVerifiedAt).toBe(new Date().toISOString().slice(0, 10));
  });

  it('404s for unknown ids', async () => {
    expect((await request(app).get('/api/admin/schemes/999999').set('Cookie', cookie)).status).toBe(404);
    expect((await request(app).put('/api/admin/schemes/999999').set('Cookie', cookie).send(newScheme)).status).toBe(404);
  });
});

describe('admin tools', () => {
  it('validates rules without saving', async () => {
    const res = await request(app)
      .post('/api/admin/rules/validate')
      .set('Cookie', cookie)
      .send({ rules: [{ groupId: 1, field: 'age', operator: '>=', value: 60 }, { groupId: 1, field: 'x', operator: '=', value: 1 }] });
    expect(res.body).toEqual({ valid: false, errors: [{ index: 1, message: 'Unknown field "x"' }] });
  });

  it('previews draft rules against a sample profile', async () => {
    const res = await request(app)
      .post('/api/admin/preview')
      .set('Cookie', cookie)
      .send({ state: 'UP', rules: [{ groupId: 1, field: 'age', operator: '>=', value: 60 }], profile: { state: 'UP', age: 70 } });
    expect(res.body.status).toBe('eligible');
  });

  it('returns rule-builder metadata and documents', async () => {
    const fields = await request(app).get('/api/admin/fields').set('Cookie', cookie);
    expect(fields.body.operators).toContain('not_in');
    const docs = await request(app).get('/api/admin/documents').set('Cookie', cookie);
    expect(docs.body.items.length).toBeGreaterThan(10);
  });

  it('returns dashboard stats', async () => {
    await request(app).post('/api/events').send({ type: 'questionnaire_start' });
    await request(app).post('/api/events').send({ type: 'questionnaire_complete' });
    const res = await request(app).get('/api/admin/stats').set('Cookie', cookie);
    expect(res.body.usage).toMatchObject({ starts: 1, completions: 1, completionRate: 100 });
    expect(res.body.catalogue).toMatchObject({ curated: 45, imported: 0 });
    expect(res.body.catalogue.stale).toBeGreaterThan(0);
  });

  it('logs out by clearing the cookie', async () => {
    const res = await request(app).post('/api/admin/auth/logout').set('Cookie', cookie);
    expect(res.status).toBe(204);
    expect(res.headers['set-cookie'][0]).toMatch(/ss_admin=;/);
  });
});

describe('login rate limiting (NFR-05)', () => {
  it('returns 429 after too many attempts', async () => {
    const fresh = createApp();
    let last = 0;
    for (let i = 0; i < 11; i++) {
      // Empty password fails validation fast (no bcrypt), but still counts towards the limit.
      last = (await request(fresh).post('/api/admin/auth/login').send({ email: 'a@b.co', password: '' })).status;
    }
    expect(last).toBe(429);
  });
});
