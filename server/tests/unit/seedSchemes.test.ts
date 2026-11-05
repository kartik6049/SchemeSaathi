/**
 * FR-05 acceptance: expected classification for every seeded scheme.
 * Each scheme must have at least one "eligible" persona, and all seed
 * rules must pass the admin validator.
 */
import { describe, expect, it } from 'vitest';
import { SCHEMES } from '../../src/db/seed/schemes.data.js';
import { evaluateScheme } from '../../src/engine/evaluate.js';
import type { EligibilityStatus, Profile } from '../../src/engine/types.js';
import { validateRules } from '../../src/engine/validate.js';

const P = {
  seniorBplUP: { state: 'UP', area: 'rural', age: 66, gender: 'male', occupation: 'retired', incomeRange: 'below_1L', category: 'general', minority: false, student: false, educationLevel: 'primary', disability: false, bplCard: true, maritalStatus: 'married' },
  widowMH: { state: 'MH', area: 'rural', age: 52, gender: 'female', occupation: 'homemaker', incomeRange: 'below_1L', category: 'obc', minority: false, student: false, educationLevel: 'primary', disability: false, bplCard: true, maritalStatus: 'widowed' },
  scStudentBR: { state: 'BR', area: 'urban', age: 19, gender: 'male', occupation: 'student', incomeRange: '1L_2_5L', category: 'sc', minority: false, student: true, educationLevel: 'graduate', disability: false, bplCard: false, maritalStatus: 'unmarried' },
  farmerMP: { state: 'MP', area: 'rural', age: 35, gender: 'male', occupation: 'farmer', incomeRange: '1L_2_5L', category: 'obc', minority: false, student: false, educationLevel: 'secondary', disability: false, bplCard: false, maritalStatus: 'married' },
  girlEngineerTN: { state: 'TN', area: 'urban', age: 19, gender: 'female', occupation: 'student', incomeRange: '2_5L_5L', category: 'general', minority: false, student: true, educationLevel: 'graduate', disability: false, bplCard: false, maritalStatus: 'unmarried' },
  streetVendorDL: { state: 'DL', area: 'urban', age: 30, gender: 'male', occupation: 'street_vendor', incomeRange: 'below_1L', category: 'general', minority: true, student: false, educationLevel: 'primary', disability: false, bplCard: true, maritalStatus: 'married' },
  artisanRJ: { state: 'RJ', area: 'rural', age: 45, gender: 'male', occupation: 'artisan', incomeRange: '1L_2_5L', category: 'obc', minority: false, student: false, educationLevel: 'primary', disability: false, bplCard: false, maritalStatus: 'married' },
  disabledStudentKA: { state: 'KA', area: 'urban', age: 20, gender: 'male', occupation: 'student', incomeRange: 'below_1L', category: 'general', minority: false, student: true, educationLevel: 'diploma', disability: true, bplCard: false, maritalStatus: 'unmarried' },
  salariedRichDL: { state: 'DL', area: 'urban', age: 35, gender: 'male', occupation: 'salaried', incomeRange: 'above_18L', category: 'general', minority: false, student: false, educationLevel: 'postgraduate', disability: false, bplCard: false, maritalStatus: 'married' },
  gradYouthUP: { state: 'UP', area: 'urban', age: 22, gender: 'female', occupation: 'unemployed', incomeRange: '2_5L_5L', category: 'general', minority: false, student: false, educationLevel: 'graduate', disability: false, bplCard: false, maritalStatus: 'unmarried' },
  class9ScUP: { state: 'UP', area: 'rural', age: 14, gender: 'female', occupation: 'student', incomeRange: 'below_1L', category: 'sc', minority: false, student: true, educationLevel: 'secondary', disability: false, bplCard: true, maritalStatus: 'unmarried' },
  minorityStudentWB: { state: 'WB', area: 'urban', age: 17, gender: 'male', occupation: 'student', incomeRange: 'below_1L', category: 'general', minority: true, student: true, educationLevel: 'higher_secondary', disability: false, bplCard: false, maritalStatus: 'unmarried' },
  richSeventyTwoKA: { state: 'KA', area: 'urban', age: 72, gender: 'male', occupation: 'retired', incomeRange: 'above_18L', category: 'general', minority: false, student: false, educationLevel: 'graduate', disability: false, bplCard: false, maritalStatus: 'married' },
} satisfies Record<string, Profile>;

type Case = [slug: string, persona: keyof typeof P | Profile, expected: EligibilityStatus];

const CASES: Case[] = [
  ['pm-kisan', 'farmerMP', 'eligible'], ['pm-kisan', 'scStudentBR', 'ineligible'],
  ['pm-fasal-bima-yojana', 'farmerMP', 'eligible'],
  ['kisan-credit-card', 'farmerMP', 'eligible'], ['kisan-credit-card', 'seniorBplUP', 'ineligible'],
  ['pm-kisan-maandhan', 'farmerMP', 'eligible'],
  ['pm-kusum', 'farmerMP', 'eligible'],
  ['soil-health-card', 'farmerMP', 'eligible'],
  ['atal-pension-yojana', 'farmerMP', 'eligible'], ['atal-pension-yojana', 'seniorBplUP', 'ineligible'],
  ['pm-jeevan-jyoti-bima', 'farmerMP', 'eligible'], ['pm-jeevan-jyoti-bima', 'seniorBplUP', 'ineligible'],
  ['pm-suraksha-bima', 'seniorBplUP', 'eligible'], ['pm-suraksha-bima', 'richSeventyTwoKA', 'ineligible'],
  ['senior-citizens-savings-scheme', 'seniorBplUP', 'eligible'], ['senior-citizens-savings-scheme', { age: 57, occupation: 'retired' }, 'eligible'],
  ['senior-citizens-savings-scheme', 'farmerMP', 'ineligible'],
  ['old-age-pension-ignoaps', 'seniorBplUP', 'eligible'], ['old-age-pension-ignoaps', 'richSeventyTwoKA', 'ineligible'],
  ['widow-pension-ignwps', 'widowMH', 'eligible'], ['widow-pension-ignwps', 'seniorBplUP', 'ineligible'],
  ['disability-pension-igndps', { disability: true, age: 30, bplCard: true }, 'eligible'], ['disability-pension-igndps', 'disabledStudentKA', 'ineligible'],
  ['rashtriya-vayoshri-yojana', 'seniorBplUP', 'eligible'], ['rashtriya-vayoshri-yojana', 'richSeventyTwoKA', 'ineligible'],
  ['adip-scheme', 'disabledStudentKA', 'eligible'],
  ['ayushman-bharat-pmjay', 'seniorBplUP', 'eligible'], ['ayushman-bharat-pmjay', 'richSeventyTwoKA', 'eligible'], ['ayushman-bharat-pmjay', 'salariedRichDL', 'ineligible'],
  ['pm-garib-kalyan-anna-yojana', 'streetVendorDL', 'eligible'], ['pm-garib-kalyan-anna-yojana', 'salariedRichDL', 'ineligible'],
  ['pm-ujjwala-yojana', 'widowMH', 'eligible'], ['pm-ujjwala-yojana', 'seniorBplUP', 'ineligible'],
  ['pmay-gramin', 'seniorBplUP', 'eligible'], ['pmay-gramin', 'streetVendorDL', 'ineligible'],
  ['pmay-urban', 'streetVendorDL', 'eligible'], ['pmay-urban', 'gradYouthUP', 'eligible'], ['pmay-urban', 'salariedRichDL', 'ineligible'],
  ['post-matric-scholarship-sc', 'scStudentBR', 'eligible'], ['post-matric-scholarship-sc', 'farmerMP', 'ineligible'],
  ['post-matric-scholarship-st', { category: 'st', student: true, educationLevel: 'higher_secondary', incomeRange: 'below_1L' }, 'eligible'],
  ['post-matric-scholarship-st', 'scStudentBR', 'ineligible'],
  ['pre-matric-scholarship-sc', 'class9ScUP', 'eligible'], ['pre-matric-scholarship-sc', 'scStudentBR', 'ineligible'],
  ['pm-yasasvi-post-matric-obc', { category: 'obc', student: true, educationLevel: 'graduate', incomeRange: '1L_2_5L' }, 'eligible'],
  ['pm-yasasvi-post-matric-obc', 'farmerMP', 'ineligible'],
  ['post-matric-scholarship-minorities', 'minorityStudentWB', 'eligible'],
  ['central-sector-scholarship', 'scStudentBR', 'eligible'], ['central-sector-scholarship', 'girlEngineerTN', 'possible'],
  ['nmms-scholarship', 'class9ScUP', 'eligible'],
  ['post-matric-scholarship-disability', 'disabledStudentKA', 'eligible'],
  ['aicte-pragati-scholarship', 'girlEngineerTN', 'eligible'], ['aicte-pragati-scholarship', 'scStudentBR', 'ineligible'],
  ['aicte-saksham-scholarship', 'disabledStudentKA', 'eligible'],
  ['e-shram', 'streetVendorDL', 'eligible'], ['e-shram', 'salariedRichDL', 'ineligible'],
  ['pm-shram-yogi-maandhan', 'streetVendorDL', 'eligible'], ['pm-shram-yogi-maandhan', 'artisanRJ', 'ineligible'],
  ['pm-vishwakarma', 'artisanRJ', 'eligible'],
  ['pm-internship-scheme', 'gradYouthUP', 'eligible'], ['pm-internship-scheme', 'scStudentBR', 'ineligible'],
  ['ddu-gky', { area: 'rural', age: 20, bplCard: true }, 'eligible'], ['ddu-gky', 'streetVendorDL', 'ineligible'],
  ['pmkvy', 'gradYouthUP', 'eligible'], ['pmkvy', 'salariedRichDL', 'ineligible'],
  ['pm-mudra-yojana', 'streetVendorDL', 'eligible'], ['pm-mudra-yojana', 'farmerMP', 'ineligible'],
  ['stand-up-india', 'gradYouthUP', 'eligible'], ['stand-up-india', 'farmerMP', 'ineligible'],
  ['pm-svanidhi', 'streetVendorDL', 'eligible'],
  ['up-old-age-pension', 'seniorBplUP', 'eligible'], ['up-old-age-pension', 'widowMH', 'ineligible'],
  ['up-old-age-pension', { state: 'UP', age: 70, incomeRange: 'below_1L' }, 'possible'],
  ['mh-ladki-bahin', 'widowMH', 'eligible'], ['mh-ladki-bahin', 'girlEngineerTN', 'ineligible'],
  ['ka-gruha-lakshmi', { state: 'KA', gender: 'female', age: 40 }, 'eligible'], ['ka-gruha-lakshmi', 'disabledStudentKA', 'ineligible'],
  ['tn-pudhumai-penn', 'girlEngineerTN', 'eligible'],
  ['wb-lakshmir-bhandar', { state: 'WB', gender: 'female', age: 30 }, 'eligible'], ['wb-lakshmir-bhandar', 'minorityStudentWB', 'ineligible'],
  ['br-student-credit-card', 'scStudentBR', 'eligible'],
];

const bySlug = new Map(SCHEMES.map((s) => [s.slug, s]));

describe('seed scheme classification (FR-05)', () => {
  it.each(CASES)('%s for %j -> %s', (slug, persona, expected) => {
    const s = bySlug.get(slug);
    expect(s, `unknown scheme ${slug}`).toBeDefined();
    const profile = typeof persona === 'string' ? P[persona] : persona;
    const ev = evaluateScheme({ slug, state: s!.state, benefitTier: s!.benefitTier, deadline: s!.deadline ?? null, rules: s!.rules }, profile);
    expect(ev.status).toBe(expected);
  });

  it('covers at least 30 schemes, each with an eligible persona', () => {
    const covered = new Set(CASES.filter((c) => c[2] === 'eligible').map((c) => c[0]));
    expect(covered.size).toBeGreaterThanOrEqual(30);
    expect(SCHEMES.filter((s) => !covered.has(s.slug)).map((s) => s.slug)).toEqual([]);
  });

  it('has only valid rules and unique slugs', () => {
    for (const s of SCHEMES) expect(validateRules(s.rules), s.slug).toEqual([]);
    expect(new Set(SCHEMES.map((s) => s.slug)).size).toBe(SCHEMES.length);
  });
});
