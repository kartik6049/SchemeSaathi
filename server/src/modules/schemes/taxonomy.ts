/**
 * Scheme taxonomy: categories and beneficiary types with bilingual labels.
 * Served by GET /api/schemes/meta for search filters (FR-11) and used to
 * validate admin input.
 */
import type { Localized } from '../../lib/i18n.js';

export const CATEGORIES: { value: string; label: Localized }[] = [
  { value: 'agriculture', label: { en: 'Agriculture', hi: 'कृषि' } },
  { value: 'education', label: { en: 'Education & Scholarships', hi: 'शिक्षा और छात्रवृत्ति' } },
  { value: 'health', label: { en: 'Health', hi: 'स्वास्थ्य' } },
  { value: 'housing', label: { en: 'Housing', hi: 'आवास' } },
  { value: 'pension', label: { en: 'Pension', hi: 'पेंशन' } },
  { value: 'insurance', label: { en: 'Insurance', hi: 'बीमा' } },
  { value: 'employment', label: { en: 'Jobs & Skills', hi: 'रोज़गार और कौशल' } },
  { value: 'business', label: { en: 'Business & Loans', hi: 'व्यवसाय और ऋण' } },
  { value: 'women_child', label: { en: 'Women & Child', hi: 'महिला और बाल' } },
  { value: 'food', label: { en: 'Food & Ration', hi: 'खाद्य और राशन' } },
  { value: 'social_welfare', label: { en: 'Social Welfare', hi: 'सामाजिक कल्याण' } },
  { value: 'finance', label: { en: 'Banking & Finance', hi: 'बैंकिंग और वित्त' } },
  { value: 'sports_culture', label: { en: 'Sports & Culture', hi: 'खेल और संस्कृति' } },
  { value: 'science_it', label: { en: 'Science & IT', hi: 'विज्ञान और आईटी' } },
  { value: 'transport', label: { en: 'Transport & Infrastructure', hi: 'परिवहन और अवसंरचना' } },
  { value: 'tourism', label: { en: 'Travel & Tourism', hi: 'यात्रा और पर्यटन' } },
  { value: 'utility', label: { en: 'Utilities & Sanitation', hi: 'उपयोगिता और स्वच्छता' } },
  { value: 'justice', label: { en: 'Safety, Law & Justice', hi: 'सुरक्षा, कानून और न्याय' } },
];

export const BENEFICIARY_TYPES: { value: string; label: Localized }[] = [
  { value: 'farmer', label: { en: 'Farmers', hi: 'किसान' } },
  { value: 'student', label: { en: 'Students', hi: 'विद्यार्थी' } },
  { value: 'women', label: { en: 'Women', hi: 'महिलाएँ' } },
  { value: 'senior_citizen', label: { en: 'Senior citizens', hi: 'वरिष्ठ नागरिक' } },
  { value: 'disabled', label: { en: 'Persons with disability', hi: 'दिव्यांगजन' } },
  { value: 'worker', label: { en: 'Workers', hi: 'श्रमिक' } },
  { value: 'entrepreneur', label: { en: 'Entrepreneurs', hi: 'उद्यमी' } },
  { value: 'sc_st', label: { en: 'SC / ST', hi: 'अनुसूचित जाति / जनजाति' } },
  { value: 'obc', label: { en: 'OBC', hi: 'अन्य पिछड़ा वर्ग' } },
  { value: 'minority', label: { en: 'Minorities', hi: 'अल्पसंख्यक' } },
  { value: 'bpl', label: { en: 'BPL families', hi: 'बीपीएल परिवार' } },
  { value: 'youth', label: { en: 'Youth', hi: 'युवा' } },
  { value: 'all', label: { en: 'All citizens', hi: 'सभी नागरिक' } },
];

export const CATEGORY_VALUES = CATEGORIES.map((c) => c.value) as [string, ...string[]];
export const BENEFICIARY_VALUES = BENEFICIARY_TYPES.map((b) => b.value) as [string, ...string[]];
