/**
 * Field registry — the single source of truth for profile questions.
 *
 * Each field defines its type, allowed options, bilingual label and the
 * questionnaire step it appears on. It drives:
 *   - GET /api/questions          (the frontend renders the questionnaire from it)
 *   - profile validation          (POST /api/match)
 *   - rule validation             (admin panel, FR-18)
 *   - match explanations          ("Age 62 ≥ 60")
 *
 * Field types:
 *   enum    — one of `options`
 *   number  — integer between min and max
 *   boolean — yes / no
 *   range   — user picks a band (e.g. income ₹1–2.5 lakh); rules compare it
 *             numerically using the band's [min, max] (see operators.ts)
 */
import type { Localized } from '../lib/i18n.js';
import { STATES } from './states.js';

export type FieldType = 'enum' | 'number' | 'boolean' | 'range';

export interface FieldOption {
  value: string;
  label: Localized;
  /** Only for `range` fields: inclusive numeric bounds of this band. */
  bounds?: [number, number];
}

/**
 * Condition for showing a question, evaluated on the answers so far
 * (e.g. pregnancy only for women 15–50). Hidden questions count as skipped.
 */
export interface ShowIf {
  field: string;
  operator: '=' | 'in' | '>=' | '<=';
  value: string | number | boolean | string[];
}

export interface FieldDef {
  key: string;
  type: FieldType;
  label: Localized;
  help?: Localized;
  /** Short noun used in explanations, e.g. "Age", "Annual family income". */
  noun: Localized;
  step: number;
  required: boolean;
  options?: FieldOption[];
  min?: number;
  max?: number;
  /** Formats numeric rule values in explanations, e.g. 250000 -> "₹2.5 lakh". */
  unit?: 'rupees' | 'years';
  /** All conditions must hold for the question to be shown. */
  showIf?: ShowIf[];
}


export const FIELDS: FieldDef[] = [
  // ── Step 1: where ──
  {
    key: 'state',
    type: 'enum',
    step: 1,
    required: true,
    label: { en: 'Which state or UT do you live in?', hi: 'आप किस राज्य या केंद्र शासित प्रदेश में रहते हैं?' },
    noun: { en: 'State', hi: 'राज्य' },
    options: STATES.map((s) => ({ value: s.code, label: s.name })),
  },
  {
    key: 'area',
    type: 'enum',
    step: 1,
    required: false,
    label: { en: 'Do you live in a village or a town/city?', hi: 'आप गाँव में रहते हैं या शहर/कस्बे में?' },
    noun: { en: 'Area', hi: 'क्षेत्र' },
    options: [
      { value: 'rural', label: { en: 'Village (rural)', hi: 'गाँव (ग्रामीण)' } },
      { value: 'urban', label: { en: 'Town / City (urban)', hi: 'कस्बा / शहर (शहरी)' } },
    ],
  },
  // ── Step 2: who ──
  {
    key: 'age',
    type: 'number',
    step: 2,
    required: true,
    min: 0,
    max: 120,
    unit: 'years',
    label: { en: 'What is your age?', hi: 'आपकी उम्र क्या है?' },
    noun: { en: 'Age', hi: 'उम्र' },
  },
  {
    key: 'gender',
    type: 'enum',
    step: 2,
    required: false,
    label: { en: 'Gender', hi: 'लिंग' },
    noun: { en: 'Gender', hi: 'लिंग' },
    options: [
      { value: 'female', label: { en: 'Female', hi: 'महिला' } },
      { value: 'male', label: { en: 'Male', hi: 'पुरुष' } },
      { value: 'transgender', label: { en: 'Transgender', hi: 'ट्रांसजेंडर' } },
    ],
  },
  // ── Step 3: family ──
  {
    key: 'maritalStatus',
    type: 'enum',
    step: 3,
    required: false,
    label: { en: 'Marital status', hi: 'वैवाहिक स्थिति' },
    noun: { en: 'Marital status', hi: 'वैवाहिक स्थिति' },
    showIf: [{ field: 'age', operator: '>=', value: 16 }],
    options: [
      { value: 'unmarried', label: { en: 'Unmarried', hi: 'अविवाहित' } },
      { value: 'married', label: { en: 'Married', hi: 'विवाहित' } },
      { value: 'widowed', label: { en: 'Widow / widower', hi: 'विधवा / विधुर' } },
      { value: 'divorced', label: { en: 'Divorced / separated', hi: 'तलाकशुदा / अलग' } },
    ],
  },
  {
    key: 'pregnantOrLactating',
    type: 'boolean',
    step: 3,
    required: false,
    label: { en: 'Are you pregnant or breastfeeding a baby?', hi: 'क्या आप गर्भवती हैं या शिशु को स्तनपान कराती हैं?' },
    noun: { en: 'Pregnant / breastfeeding', hi: 'गर्भवती / स्तनपान' },
    showIf: [
      { field: 'gender', operator: '=', value: 'female' },
      { field: 'age', operator: '>=', value: 15 },
      { field: 'age', operator: '<=', value: 50 },
    ],
  },
  // ── Step 4: work ──
  {
    key: 'occupation',
    type: 'enum',
    step: 4,
    required: false,
    label: { en: 'What do you mainly do?', hi: 'आप मुख्य रूप से क्या करते हैं?' },
    noun: { en: 'Occupation', hi: 'व्यवसाय' },
    options: [
      { value: 'farmer', label: { en: 'Farmer', hi: 'किसान' } },
      { value: 'student', label: { en: 'Student', hi: 'विद्यार्थी' } },
      { value: 'unorganised_worker', label: { en: 'Daily wage / unorganised worker', hi: 'दिहाड़ी / असंगठित मज़दूर' } },
      { value: 'street_vendor', label: { en: 'Street vendor', hi: 'रेहड़ी-पटरी विक्रेता' } },
      { value: 'artisan', label: { en: 'Artisan / weaver / craftsperson', hi: 'कारीगर / बुनकर / शिल्पकार' } },
      { value: 'fisher', label: { en: 'Fisher', hi: 'मछुआरा' } },
      { value: 'self_employed', label: { en: 'Own business / self-employed', hi: 'अपना व्यवसाय / स्वरोज़गार' } },
      { value: 'salaried', label: { en: 'Salaried job', hi: 'वेतनभोगी नौकरी' } },
      { value: 'sportsperson', label: { en: 'Sportsperson', hi: 'खिलाड़ी' } },
      { value: 'artist', label: { en: 'Artist / performer', hi: 'कलाकार' } },
      { value: 'homemaker', label: { en: 'Homemaker', hi: 'गृहिणी' } },
      { value: 'unemployed', label: { en: 'Looking for work', hi: 'काम की तलाश में' } },
      { value: 'retired', label: { en: 'Retired', hi: 'सेवानिवृत्त' } },
    ],
  },
  {
    key: 'bocwRegistered',
    type: 'boolean',
    step: 4,
    required: false,
    label: {
      en: 'Are you or a family member registered with the Construction Workers Welfare Board?',
      hi: 'क्या आप या परिवार का कोई सदस्य भवन निर्माण श्रमिक कल्याण बोर्ड में पंजीकृत है?',
    },
    noun: { en: 'Registered construction worker (family)', hi: 'पंजीकृत निर्माण श्रमिक (परिवार)' },
    showIf: [{ field: 'occupation', operator: 'in', value: ['unorganised_worker', 'student', 'homemaker', 'unemployed'] }],
  },
  // ── Step 5: money ──
  {
    key: 'incomeRange',
    type: 'range',
    step: 5,
    required: false,
    unit: 'rupees',
    label: { en: 'Annual income of your whole family', hi: 'आपके पूरे परिवार की सालाना आय' },
    help: { en: 'An approximate range is enough.', hi: 'अनुमानित सीमा पर्याप्त है।' },
    noun: { en: 'Annual family income', hi: 'परिवार की सालाना आय' },
    options: [
      { value: 'below_1L', bounds: [0, 100_000], label: { en: 'Up to ₹1 lakh', hi: '₹1 लाख तक' } },
      { value: '1L_2_5L', bounds: [100_001, 250_000], label: { en: '₹1 – 2.5 lakh', hi: '₹1 – 2.5 लाख' } },
      { value: '2_5L_5L', bounds: [250_001, 500_000], label: { en: '₹2.5 – 5 lakh', hi: '₹2.5 – 5 लाख' } },
      { value: '5L_8L', bounds: [500_001, 800_000], label: { en: '₹5 – 8 lakh', hi: '₹5 – 8 लाख' } },
      { value: '8L_18L', bounds: [800_001, 1_800_000], label: { en: '₹8 – 18 lakh', hi: '₹8 – 18 लाख' } },
      { value: 'above_18L', bounds: [1_800_001, Number.MAX_SAFE_INTEGER], label: { en: 'Above ₹18 lakh', hi: '₹18 लाख से अधिक' } },
    ],
  },
  {
    key: 'incomeTaxPayer',
    type: 'boolean',
    step: 5,
    required: false,
    label: { en: 'Do you (or your spouse) pay income tax?', hi: 'क्या आप (या आपके जीवनसाथी) आयकर देते हैं?' },
    noun: { en: 'Income-tax payer', hi: 'आयकर दाता' },
    showIf: [{ field: 'age', operator: '>=', value: 18 }],
  },
  // ── Step 6: community ──
  {
    key: 'category',
    type: 'enum',
    step: 6,
    required: false,
    label: { en: 'Social category', hi: 'सामाजिक वर्ग' },
    noun: { en: 'Category', hi: 'वर्ग' },
    options: [
      { value: 'general', label: { en: 'General', hi: 'सामान्य' } },
      { value: 'obc', label: { en: 'OBC', hi: 'अन्य पिछड़ा वर्ग (OBC)' } },
      { value: 'sc', label: { en: 'Scheduled Caste (SC)', hi: 'अनुसूचित जाति (SC)' } },
      { value: 'st', label: { en: 'Scheduled Tribe (ST)', hi: 'अनुसूचित जनजाति (ST)' } },
    ],
  },
  {
    key: 'minority',
    type: 'boolean',
    step: 6,
    required: false,
    label: { en: 'Do you belong to a notified minority community?', hi: 'क्या आप अधिसूचित अल्पसंख्यक समुदाय से हैं?' },
    help: { en: 'Muslim, Christian, Sikh, Buddhist, Jain or Parsi.', hi: 'मुस्लिम, ईसाई, सिख, बौद्ध, जैन या पारसी।' },
    noun: { en: 'Minority community', hi: 'अल्पसंख्यक समुदाय' },
  },
  // ── Step 7: education ──
  {
    key: 'student',
    type: 'boolean',
    step: 7,
    required: false,
    label: { en: 'Are you currently studying?', hi: 'क्या आप अभी पढ़ाई कर रहे हैं?' },
    noun: { en: 'Currently studying', hi: 'वर्तमान में पढ़ाई' },
  },
  {
    key: 'educationLevel',
    type: 'enum',
    step: 7,
    required: false,
    label: { en: 'Current (or highest) level of education', hi: 'वर्तमान (या उच्चतम) शिक्षा स्तर' },
    noun: { en: 'Education level', hi: 'शिक्षा स्तर' },
    options: [
      { value: 'none', label: { en: 'No formal schooling', hi: 'कोई औपचारिक शिक्षा नहीं' } },
      { value: 'primary', label: { en: 'Class 1 – 8', hi: 'कक्षा 1 – 8' } },
      { value: 'secondary', label: { en: 'Class 9 – 10', hi: 'कक्षा 9 – 10' } },
      { value: 'higher_secondary', label: { en: 'Class 11 – 12', hi: 'कक्षा 11 – 12' } },
      { value: 'diploma', label: { en: 'Diploma / ITI', hi: 'डिप्लोमा / आईटीआई' } },
      { value: 'graduate', label: { en: 'Graduation', hi: 'स्नातक' } },
      { value: 'postgraduate', label: { en: 'Post-graduation or above', hi: 'स्नातकोत्तर या अधिक' } },
    ],
  },
  // ── Step 8: support needs ──
  {
    key: 'disability',
    type: 'boolean',
    step: 8,
    required: false,
    label: { en: 'Do you have a disability (40% or more)?', hi: 'क्या आपको 40% या अधिक दिव्यांगता है?' },
    noun: { en: 'Disability', hi: 'दिव्यांगता' },
  },
  {
    key: 'bplCard',
    type: 'boolean',
    step: 8,
    required: false,
    label: {
      en: 'Does your family have a BPL / Antyodaya / priority ration card?',
      hi: 'क्या आपके परिवार के पास बीपीएल / अंत्योदय / प्राथमिकता राशन कार्ड है?',
    },
    noun: { en: 'BPL / priority ration card', hi: 'बीपीएल / प्राथमिकता राशन कार्ड' },
  },
  // ── Step 9: special groups ──
  {
    key: 'exServiceman',
    type: 'boolean',
    step: 9,
    required: false,
    label: { en: 'Are you an ex-serviceman, or a dependant of one?', hi: 'क्या आप पूर्व सैनिक हैं, या उनके आश्रित हैं?' },
    noun: { en: 'Ex-serviceman / dependant', hi: 'पूर्व सैनिक / आश्रित' },
    showIf: [{ field: 'age', operator: '>=', value: 18 }],
  },
  {
    key: 'hasGirlChild',
    type: 'boolean',
    step: 9,
    required: false,
    label: { en: 'Is there a girl under 18 in your family (including you)?', hi: 'क्या आपके परिवार में 18 वर्ष से कम उम्र की कोई बालिका है (आप सहित)?' },
    noun: { en: 'Girl child in family', hi: 'परिवार में बालिका' },
  },
];

/** Is a question visible for these answers? Unanswered conditions hide it. */
export function isFieldVisible(field: FieldDef, answers: Record<string, unknown>): boolean {
  return (field.showIf ?? []).every((c) => {
    const v = answers[c.field];
    if (v === undefined || v === null || v === '') return false;
    switch (c.operator) {
      case '=': return v === c.value;
      case 'in': return Array.isArray(c.value) && c.value.includes(String(v));
      case '>=': return typeof v === 'number' && v >= (c.value as number);
      case '<=': return typeof v === 'number' && v <= (c.value as number);
    }
  });
}

export const FIELD_MAP: ReadonlyMap<string, FieldDef> = new Map(FIELDS.map((f) => [f.key, f]));

export const TOTAL_STEPS = Math.max(...FIELDS.map((f) => f.step));

export function getField(key: string): FieldDef | undefined {
  return FIELD_MAP.get(key);
}

/** Returns the [min, max] bounds of a range option, or undefined. */
export function rangeBounds(field: FieldDef, optionValue: string): [number, number] | undefined {
  return field.options?.find((o) => o.value === optionValue)?.bounds;
}
