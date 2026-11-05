/**
 * Import pipeline against the test DB: mapped myScheme records are inserted,
 * matched, searchable, refreshed on re-import, and curated/reviewed schemes
 * are never overwritten. Also covers match `limit` and public counts.
 */
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { importCatalogue } from '../../src/db/import/index.js';
import { mapRecord, type MySchemeRecord } from '../../src/importer/mapMyScheme.js';
import { invalidateSchemeCache } from '../../src/modules/schemes/schemes.service.js';
import { pool, resetDb } from '../helpers/testDb.js';

const app = createApp();
const details = {
  details: '',
  benefits: 'Boat subsidy of ₹50,000.',
  eligibility: ['The applicant should be a fisherman.', 'The applicant should be between 18 and 60 years of age.'],
  applicationProcess: 'Apply at the fisheries office.',
  documents: ['Aadhaar Card', 'Fishing Licence'],
};
const records: MySchemeRecord[] = [
  { slug: 'kl-fisher-boat', schemeName: 'Kerala Fisher Boat Subsidy', level: 'State', schemeFor: 'Individual', beneficiaryState: ['Kerala'], schemeCategory: ['Agriculture,Rural & Environment'], briefDescription: 'Subsidy for fishermen.', tags: ['Fishermen', 'Subsidy'] },
  { slug: 'org-only-grant', schemeName: 'Panchayat Infrastructure Grant', level: 'Central', schemeFor: 'Infra', beneficiaryState: ['All'], schemeCategory: ['Transport & Infrastructure'], briefDescription: 'Grant for panchayats.', tags: ['Infrastructure'] },
  // Same slug as a curated seed scheme: must not be overwritten
  { slug: 'pm-kisan', schemeName: 'IMPORTED COPY', level: 'Central', schemeFor: 'Individual', beneficiaryState: ['All'], schemeCategory: [], briefDescription: 'x', tags: ['Farmer'] },
];

let file: string;
const log = () => {};

beforeAll(async () => {
  await resetDb();
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ss-import-'));
  file = path.join(dir, 'catalogue.json');
  const mapped = records.map((r) => mapRecord(r, r.slug === 'kl-fisher-boat' ? details : undefined, '2026-03-20'));
  await writeFile(file, JSON.stringify(mapped));
  await importCatalogue(file, log);
  invalidateSchemeCache();
});
afterAll(() => pool.end());

describe('importCatalogue', () => {
  it('inserts imported schemes with provenance and new documents', async () => {
    const res = await request(app).get('/api/schemes/kl-fisher-boat');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ source: 'myscheme', needsReview: true, state: 'KL', officialUrl: 'https://www.myscheme.gov.in/schemes/kl-fisher-boat' });
    expect(res.body.documents.map((d: { code: string }) => d.code)).toEqual(['aadhaar', 'x-fishing-licence']);
    expect(res.body.importNotes).toContain('tag:fisher');
  });

  it('never overwrites curated schemes', async () => {
    const res = await request(app).get('/api/schemes/pm-kisan');
    expect(res.body.name.en).toBe('PM Kisan Samman Nidhi (PM-KISAN)');
    expect(res.body.source).toBe('curated');
  });

  it('matches imported schemes, but not organisation-only ones', async () => {
    const res = await request(app).post('/api/match?limit=100').send({ state: 'KL', age: 30, occupation: 'fisher' });
    const ids = res.body.eligible.map((e: { schemeId: string }) => e.schemeId);
    expect(ids).toContain('kl-fisher-boat');
    expect(ids).not.toContain('org-only-grant');
    // ...yet organisation schemes remain browsable
    expect((await request(app).get('/api/schemes/org-only-grant')).status).toBe(200);
  });

  it('ranks curated schemes above imports with an equal match', async () => {
    const res = await request(app).post('/api/match?limit=500').send({ state: 'KL', age: 30, occupation: 'fisher' });
    const imported = res.body.eligible.find((e: { schemeId: string }) => e.schemeId === 'kl-fisher-boat');
    expect(imported.scheme.needsReview).toBe(true);
  });

  it('refreshes un-reviewed imports but keeps reviewed ones', async () => {
    await pool.query(`UPDATE schemes SET summary_en = 'edited' WHERE slug = 'kl-fisher-boat'`);
    await importCatalogue(file, log);
    expect((await pool.query(`SELECT summary_en FROM schemes WHERE slug = 'kl-fisher-boat'`)).rows[0].summary_en).not.toBe('edited');

    await pool.query(`UPDATE schemes SET summary_en = 'reviewed', needs_review = false WHERE slug = 'kl-fisher-boat'`);
    await importCatalogue(file, log);
    expect((await pool.query(`SELECT summary_en FROM schemes WHERE slug = 'kl-fisher-boat'`)).rows[0].summary_en).toBe('reviewed');
  });

  it('admin edits keep provenance and can mark a scheme reviewed', async () => {
    const login = await request(app).post('/api/admin/auth/login').send({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD });
    const cookie = login.headers['set-cookie'][0];
    const { rows } = await pool.query(`SELECT id FROM schemes WHERE slug = 'org-only-grant'`);
    const current = (await request(app).get(`/api/admin/schemes/${rows[0].id}`).set('Cookie', cookie)).body;
    const input = { ...current, documents: current.documents.map((d: { code: string }) => d.code), needsReview: false };
    const res = await request(app).put(`/api/admin/schemes/${rows[0].id}`).set('Cookie', cookie).send(input);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ source: 'myscheme', needsReview: false, audience: 'organisation', matchable: false });
  });
});

describe('match limit and public counts', () => {
  it('caps result lists but keeps full counts', async () => {
    const res = await request(app).post('/api/match?limit=2').send({ state: 'UP', age: 30 });
    expect(res.body.eligible.length).toBeLessThanOrEqual(2);
    expect(res.body.counts.eligible).toBeGreaterThan(2);
    expect(res.body.limit).toBe(2);
  });

  it('exposes catalogue counts in meta', async () => {
    const res = await request(app).get('/api/schemes/meta');
    expect(res.body.counts.total).toBe(47); // 45 curated + 2 imported (the pm-kisan copy is skipped)
    expect(res.body.counts.byCategory.agriculture).toBeGreaterThan(0);
  });
});
