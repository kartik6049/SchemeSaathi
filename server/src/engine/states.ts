/**
 * Indian states and union territories (codes follow vehicle-registration style).
 * Used by the questionnaire's "state" question and to validate scheme.state.
 */
import type { Localized } from '../lib/i18n.js';

export const STATES: { code: string; name: Localized }[] = [
  { code: 'AN', name: { en: 'Andaman & Nicobar Islands', hi: 'अंडमान और निकोबार द्वीपसमूह' } },
  { code: 'AP', name: { en: 'Andhra Pradesh', hi: 'आंध्र प्रदेश' } },
  { code: 'AR', name: { en: 'Arunachal Pradesh', hi: 'अरुणाचल प्रदेश' } },
  { code: 'AS', name: { en: 'Assam', hi: 'असम' } },
  { code: 'BR', name: { en: 'Bihar', hi: 'बिहार' } },
  { code: 'CH', name: { en: 'Chandigarh', hi: 'चंडीगढ़' } },
  { code: 'CG', name: { en: 'Chhattisgarh', hi: 'छत्तीसगढ़' } },
  { code: 'DH', name: { en: 'Dadra & Nagar Haveli and Daman & Diu', hi: 'दादरा और नगर हवेली और दमन और दीव' } },
  { code: 'DL', name: { en: 'Delhi', hi: 'दिल्ली' } },
  { code: 'GA', name: { en: 'Goa', hi: 'गोवा' } },
  { code: 'GJ', name: { en: 'Gujarat', hi: 'गुजरात' } },
  { code: 'HR', name: { en: 'Haryana', hi: 'हरियाणा' } },
  { code: 'HP', name: { en: 'Himachal Pradesh', hi: 'हिमाचल प्रदेश' } },
  { code: 'JK', name: { en: 'Jammu & Kashmir', hi: 'जम्मू और कश्मीर' } },
  { code: 'JH', name: { en: 'Jharkhand', hi: 'झारखंड' } },
  { code: 'KA', name: { en: 'Karnataka', hi: 'कर्नाटक' } },
  { code: 'KL', name: { en: 'Kerala', hi: 'केरल' } },
  { code: 'LA', name: { en: 'Ladakh', hi: 'लद्दाख' } },
  { code: 'LD', name: { en: 'Lakshadweep', hi: 'लक्षद्वीप' } },
  { code: 'MP', name: { en: 'Madhya Pradesh', hi: 'मध्य प्रदेश' } },
  { code: 'MH', name: { en: 'Maharashtra', hi: 'महाराष्ट्र' } },
  { code: 'MN', name: { en: 'Manipur', hi: 'मणिपुर' } },
  { code: 'ML', name: { en: 'Meghalaya', hi: 'मेघालय' } },
  { code: 'MZ', name: { en: 'Mizoram', hi: 'मिज़ोरम' } },
  { code: 'NL', name: { en: 'Nagaland', hi: 'नागालैंड' } },
  { code: 'OD', name: { en: 'Odisha', hi: 'ओडिशा' } },
  { code: 'PY', name: { en: 'Puducherry', hi: 'पुडुचेरी' } },
  { code: 'PB', name: { en: 'Punjab', hi: 'पंजाब' } },
  { code: 'RJ', name: { en: 'Rajasthan', hi: 'राजस्थान' } },
  { code: 'SK', name: { en: 'Sikkim', hi: 'सिक्किम' } },
  { code: 'TN', name: { en: 'Tamil Nadu', hi: 'तमिलनाडु' } },
  { code: 'TS', name: { en: 'Telangana', hi: 'तेलंगाना' } },
  { code: 'TR', name: { en: 'Tripura', hi: 'त्रिपुरा' } },
  { code: 'UP', name: { en: 'Uttar Pradesh', hi: 'उत्तर प्रदेश' } },
  { code: 'UK', name: { en: 'Uttarakhand', hi: 'उत्तराखंड' } },
  { code: 'WB', name: { en: 'West Bengal', hi: 'पश्चिम बंगाल' } },
];

export const STATE_CODES = new Set(STATES.map((s) => s.code));
