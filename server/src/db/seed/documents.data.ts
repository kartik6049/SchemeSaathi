/**
 * Seed list of documents referenced by schemes (code -> bilingual name).
 * Schemes reference documents by `code` so the checklist can de-duplicate (FR-10).
 */
export const DOCUMENTS: { code: string; en: string; hi: string }[] = [
  { code: 'aadhaar', en: 'Aadhaar card (for identity / e-KYC)', hi: 'आधार कार्ड (पहचान / ई-केवाईसी के लिए)' },
  { code: 'bank_passbook', en: 'Bank account passbook / cancelled cheque', hi: 'बैंक खाता पासबुक / रद्द चेक' },
  { code: 'photo', en: 'Passport-size photograph', hi: 'पासपोर्ट आकार की फ़ोटो' },
  { code: 'mobile', en: 'Mobile number (linked with Aadhaar)', hi: 'मोबाइल नंबर (आधार से जुड़ा)' },
  { code: 'income_cert', en: 'Income certificate', hi: 'आय प्रमाण पत्र' },
  { code: 'caste_cert', en: 'Caste certificate', hi: 'जाति प्रमाण पत्र' },
  { code: 'disability_cert', en: 'Disability certificate / UDID card', hi: 'दिव्यांगता प्रमाण पत्र / यूडीआईडी कार्ड' },
  { code: 'ration_card', en: 'Ration card (BPL / Antyodaya / priority household)', hi: 'राशन कार्ड (बीपीएल / अंत्योदय / प्राथमिकता परिवार)' },
  { code: 'age_proof', en: 'Age proof (birth certificate / school certificate)', hi: 'आयु प्रमाण (जन्म प्रमाण पत्र / स्कूल प्रमाण पत्र)' },
  { code: 'domicile_cert', en: 'Domicile / residence certificate', hi: 'निवास / अधिवास प्रमाण पत्र' },
  { code: 'land_records', en: 'Land ownership records (khatauni / RoR)', hi: 'भूमि स्वामित्व दस्तावेज़ (खतौनी / अभिलेख)' },
  { code: 'marksheet', en: 'Previous class marksheet', hi: 'पिछली कक्षा की अंकतालिका' },
  { code: 'admission_proof', en: 'Admission proof / bonafide certificate', hi: 'प्रवेश प्रमाण / बोनाफ़ाइड प्रमाण पत्र' },
  { code: 'fee_receipt', en: 'Fee receipt of current year', hi: 'चालू वर्ष की फ़ीस रसीद' },
  { code: 'death_cert_spouse', en: "Husband's death certificate", hi: 'पति का मृत्यु प्रमाण पत्र' },
  { code: 'business_plan', en: 'Business plan / project report', hi: 'व्यवसाय योजना / परियोजना रिपोर्ट' },
  { code: 'vending_cert', en: 'Vending certificate or Letter of Recommendation from ULB', hi: 'वेंडिंग प्रमाण पत्र या नगर निकाय का अनुशंसा पत्र' },
  { code: 'sowing_cert', en: 'Sowing certificate / crop details', hi: 'बुवाई प्रमाण पत्र / फ़सल विवरण' },
  { code: 'nominee', en: 'Nominee details', hi: 'नामांकित व्यक्ति का विवरण' },
  { code: 'school_cert', en: 'Certificate of schooling (government school)', hi: 'सरकारी स्कूल में पढ़ाई का प्रमाण पत्र' },
  { code: 'retirement_proof', en: 'Retirement / superannuation proof', hi: 'सेवानिवृत्ति का प्रमाण' },
];
