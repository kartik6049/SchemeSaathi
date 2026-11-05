/**
 * Data-import pipeline: PDF section parsing, rule extraction heuristics and
 * myScheme record mapping. Includes regressions found while spot-checking
 * the real catalogue.
 */
import { describe, expect, it } from 'vitest';
import { evaluateScheme } from '../../src/engine/evaluate.js';
import { validateRules } from '../../src/engine/validate.js';
import { extractAgeRange, extractIncomeLimit, extractRules, splitIdentityGroups } from '../../src/importer/extractRules.js';
import { mapCategory, mapDocument, mapRecord, stateCode } from '../../src/importer/mapMyScheme.js';
import { fixMojibake, parseSchemeText, splitDocuments, splitSentences } from '../../src/importer/pdfSections.js';
import { applyHindi, checkTranslation, translatableStrings } from '../../src/importer/translations.js';

const field = <R extends { field: string }>(rules: R[], f: string) => rules.filter((r) => r.field === f);

describe('pdfSections', () => {
  const page =
    'Sign InBack Details Benefits Check EligibilityJharkhandAnnath Pension YojanaPensionDetails"Annath Pension" is a scheme by the Department of Labour, Govt of Jharkhand. ' +
    'BenefitsPension of ₹1,000 per month.EligibilityThe applicant should be less than 18 years of age.The applicant should be a child of the deceased.' +
    'Application ProcessOnline via portal.Documents RequiredAadhaar CardDeath CertificateProof of Age / Date of BirthFrequently Asked QuestionsQ?';

  it('extracts every section in order', () => {
    const d = parseSchemeText(page)!;
    expect(d.benefits).toBe('Pension of ₹1,000 per month.');
    expect(d.eligibility).toEqual(['The applicant should be less than 18 years of age.', 'The applicant should be a child of the deceased.']);
    expect(d.applicationProcess).toBe('Online via portal.');
    expect(d.documents).toEqual(['Aadhaar Card', 'Death Certificate', 'Proof of Age / Date of Birth']);
    expect(d.department).toBe('Department of Labour');
  });

  it('returns null for pages without the expected structure', () => {
    expect(parseSchemeText('random text')).toBeNull();
  });

  it('repairs mojibake and splits run-together text', () => {
    expect(fixMojibake('click â€œPRINTâ€ ï»¿now')).toBe('click "PRINT" now');
    expect(splitSentences('Age 18.Must be a resident. Income below ₹1 lakh.')).toEqual(['Age 18.', 'Must be a resident.', 'Income below ₹1 lakh.']);
    expect(splitDocuments('Aadhaar CardIncome Certificate (Tahsildar)Bank Passbook')).toEqual(['Aadhaar Card', 'Income Certificate (Tahsildar)', 'Bank Passbook']);
  });
});

describe('extractIncomeLimit', () => {
  it.each([
    ['The annual family income should not exceed ₹2,50,000.', 250_000],
    ['Annual income of the family must be less than Rs. 2.5 lakh per annum', 250_000],
    ['Parental income not more than ₹ 8 lakhs.', 800_000],
    ['The monthly income should not exceed ₹15,000.', 180_000],
    ['Applicant income less than ₹10,000 per month', 120_000],
    ['The scheme provides ₹50,000 to farmers', null],
  ])('%s -> %s', (text, expected) => {
    expect(extractIncomeLimit(text)).toBe(expected);
  });
});

describe('extractAgeRange', () => {
  it.each([
    ['The applicant should be between 18 and 40 years of age.', { min: 18, max: 40 }],
    ['Age of the applicant: 21-24 years.', { min: 21, max: 24 }],
    ['The applicant should be 60 years or above.', { min: 60 }],
    ['The applicant must be below 35 years of age.', { max: 35 }],
    // Ages about someone else must be ignored
    ['The daughter should be above 18 years of age at marriage.', {}],
    ['The child must be below 6 years of age.', {}],
  ])('%s', (text, expected) => {
    expect(extractAgeRange(text)).toEqual(expected);
  });
});

describe('extractRules', () => {
  it('maps tags to valid rules', () => {
    const { rules } = extractRules(['Persons With Disability', 'Post-Matric', 'Student', 'Scholarship'], '');
    expect(validateRules(rules)).toEqual([]);
    expect(field(rules, 'disability')[0]).toMatchObject({ value: true });
    expect(field(rules, 'student')[0]).toMatchObject({ value: true });
    expect(field(rules, 'educationLevel')[0]).toMatchObject({ operator: 'in' });
  });

  it('combines tags and text', () => {
    const { rules, signals } = extractRules(['Widow', 'Pension'], 'The applicant should be 18 years or above. Annual family income should not exceed ₹1,00,000.');
    expect(rules.map((r) => r.field).sort()).toEqual(['age', 'gender', 'incomeRange', 'maritalStatus']);
    expect(signals).toContain('tag/text:widow');
  });

  it('regression: student startup scheme does not also require an entrepreneur occupation', () => {
    const { rules } = extractRules(['Scheduled Caste', 'Student', 'Entrepreneurship'], '');
    expect(field(rules, 'occupation')).toEqual([]);
    expect(evaluateScheme({ slug: 'x', state: null, benefitTier: 2, deadline: null, rules }, { category: 'sc', student: true }).status).toBe('eligible');
  });

  it('regression: several identity tags become OR groups, not an impossible AND', () => {
    const { rules } = extractRules(['Girl', 'Scheduled Caste', 'Scheduled Tribe', 'BPL', 'Student'], '');
    const scheme = { slug: 'x', state: null, benefitTier: 2, deadline: null, rules };
    // An SC boy student and a general-category BPL student both qualify
    expect(evaluateScheme(scheme, { gender: 'male', category: 'sc', student: true, bplCard: false }).status).toBe('eligible');
    expect(evaluateScheme(scheme, { gender: 'male', category: 'general', student: true, bplCard: true }).status).toBe('eligible');
    expect(evaluateScheme(scheme, { gender: 'male', category: 'general', student: true, bplCard: false }).status).toBe('ineligible');
  });

  it('keeps gender with widowhood instead of splitting it off', () => {
    const rules = splitIdentityGroups([
      { groupId: 1, field: 'gender', operator: '=', value: 'female' },
      { groupId: 1, field: 'maritalStatus', operator: '=', value: 'widowed' },
      { groupId: 1, field: 'bplCard', operator: '=', value: true },
    ]);
    expect(new Set(rules.map((r) => r.groupId))).toEqual(new Set([1]));
  });

  it('detects specific groups', () => {
    expect(field(extractRules(['Construction Worker'], '').rules, 'bocwRegistered')).toHaveLength(1);
    expect(field(extractRules(['Ex-Servicemen'], '').rules, 'exServiceman')).toHaveLength(1);
    expect(field(extractRules(['Fishermen'], '').rules, 'occupation')[0].value).toBe('fisher');
    expect(field(extractRules([], 'Should not be an income tax payer.').rules, 'incomeTaxPayer')[0].value).toBe(false);
    expect(field(extractRules(['Pregnant Women'], '').rules, 'pregnantOrLactating')).toHaveLength(1);
  });
});

describe('mapMyScheme', () => {
  const rec = {
    slug: 'test-scheme',
    schemeName: 'Test Widow Pension',
    level: 'State',
    schemeFor: 'Individual',
    schemeCategory: ['Social welfare & Empowerment'],
    beneficiaryState: ['Uttar Pradesh'],
    briefDescription: 'Pension for widows.',
    tags: ['Widow', 'Pension'],
    schemeCloseDate: null,
  };

  it('maps a state scheme with rules, category and myScheme link', () => {
    const s = mapRecord(rec, undefined, '2026-03-20');
    expect(s).toMatchObject({ state: 'UP', category: 'pension', source: 'myscheme', needsReview: true, matchable: true, lastVerifiedAt: '2026-03-20' });
    expect(s.officialUrl).toBe('https://www.myscheme.gov.in/schemes/test-scheme');
    expect(s.name.hi).toBe('');
    expect(s.beneficiaryTypes).toContain('women');
  });

  it('uses a state IN rule for multi-state schemes', () => {
    const s = mapRecord({ ...rec, beneficiaryState: ['Assam', 'Sikkim'] }, undefined, '2026-03-20');
    expect(s.state).toBeNull();
    expect(s.rules[0]).toMatchObject({ field: 'state', operator: 'in', value: ['AS', 'SK'] });
  });

  it('marks organisation schemes and generic-only schemes as browse-only', () => {
    expect(mapRecord({ ...rec, schemeFor: 'Infra' }, undefined, 'x').matchable).toBe(false);
    expect(mapRecord({ ...rec, tags: [], briefDescription: 'Age 18 to 60 years of age.' }, undefined, 'x').matchable).toBe(false);
  });

  it('maps states, categories and documents', () => {
    expect(stateCode('Jammu and Kashmir')).toBe('JK');
    expect(stateCode('Dadra & Nagar Haveli and Daman & Diu')).toBe('DH');
    expect(stateCode('Tamil Nadu')).toBe('TN');
    expect(mapCategory(['Education & Learning'], ['Fellowship'])).toBe('education');
    expect(mapCategory(['Sports & Culture'], [])).toBe('sports_culture');
    expect(mapDocument('Aadhar Card')).toEqual({ code: 'aadhaar', isNew: false });
    expect(mapDocument('Income Certificate Issued by Tahsildar')).toEqual({ code: 'income_cert', isNew: false });
    expect(mapDocument('Fishing Licence')).toEqual({ code: 'x-fishing-licence', isNew: true });
  });
});

describe('translations', () => {
  const rec = { slug: 'skill-loan', schemeName: 'Skill Loan Scheme', level: 'Central', nodalMinistryName: 'Ministry Of Defence', briefDescription: 'A loan for students.', tags: ['Student'] };
  const details = { benefits: '', eligibility: [], applicationProcess: '', documents: ['Fishing Licence'] } as unknown as Parameters<typeof mapRecord>[1];
  const s = mapRecord(rec, details, 'x');

  it('lists every English string, including new document names', () => {
    expect(translatableStrings(s)).toEqual(['Skill Loan Scheme', 'Ministry Of Defence', 'A loan for students.', 'Fishing Licence']);
  });

  it('fills empty Hindi from the dictionary and keeps existing Hindi', () => {
    const dict = { 'Skill Loan Scheme': 'कौशल ऋण योजना', 'Ministry Of Defence': 'रक्षा मंत्रालय', 'Fishing Licence': 'मत्स्य पालन लाइसेंस' };
    const out = applyHindi({ ...s, ministry: { en: 'Ministry Of Defence', hi: 'पहले से' } }, dict);
    expect(out.name).toEqual({ en: 'Skill Loan Scheme', hi: 'कौशल ऋण योजना' });
    expect(out.ministry.hi).toBe('पहले से');
    expect(out.summary.hi).toBe('');
    expect(out.newDocuments).toEqual([['x-fishing-licence', 'Fishing Licence', 'मत्स्य पालन लाइसेंस']]);
    expect(s.name.hi).toBe('');
  });

  it('rejects empty, untranslated and truncated output', () => {
    expect(checkTranslation('Skill Loan Scheme', 'कौशल ऋण योजना')).toBeNull();
    expect(checkTranslation('NSP', 'NSP')).toBeNull();
    expect(checkTranslation('Skill Loan Scheme', '')).toBe('empty');
    expect(checkTranslation('Skill Loan Scheme', 'Skill Loan Scheme')).toBe('no Devanagari');
    expect(checkTranslation('x'.repeat(500), 'छोटा')).toBe('too short (truncated?)');
    expect(checkTranslation('• Aadhaar\n• Ration card', '• आधार, राशन कार्ड')).toBe('line count differs');
    expect(checkTranslation('• Aadhaar\n• Ration card', '• आधार\n• राशन कार्ड\n')).toBeNull();
  });
});
