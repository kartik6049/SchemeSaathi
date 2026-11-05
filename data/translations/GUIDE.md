# Hindi translation guide (imported schemes)

Applies to everyone translating chunks in `work/todo/` — people or AI.
Output: `work/done/NNNN.json`, a JSON object `{ "<id>": "<Hindi>" }` with every id of the chunk.

## Style
- Simple, standard Hindi as used on government portals (myScheme, india.gov.in). Polite, neutral register; address the reader as "आप".
- Prefer words citizens know over Sanskritised coinage: "आवेदन", "पात्रता", "लाभ", "प्रमाण पत्र", "बैंक खाता", "छात्रवृत्ति", "पेंशन", "ऋण" (or "लोन" where it reads more naturally).
- Translate the meaning, not word by word. Don't add, drop or soften conditions — amounts, limits, ages and "not eligible if…" must stay exact.

## Names
- **Scheme names:** use the official Hindi name if one exists ("Pradhan Mantri Awas Yojana" → "प्रधानमंत्री आवास योजना"). Otherwise translate the descriptive words and keep proper nouns in Devanagari: "Mukhyamantri Kanya Vivah Yojana" → "मुख्यमंत्री कन्या विवाह योजना"; "Skill Loan Scheme" → "कौशल ऋण योजना".
- Keep abbreviations in Latin letters, and add them in brackets after the Hindi if they come first: "RMEWF-Financial Assistance…" → "RMEWF - … वित्तीय सहायता".
- **Ministries/departments:** official Hindi names ("Ministry Of Defence" → "रक्षा मंत्रालय", "Department of Social Welfare, Government of Bihar" → "समाज कल्याण विभाग, बिहार सरकार").
- States, districts and people: standard Devanagari spelling.

## Keep unchanged
- Numbers and amounts exactly as written (₹1,50,000, Rs. 5000, 18–40 years → 18–40 वर्ष), dates, percentages.
- URLs, email addresses, phone numbers, form numbers, portal names written in Latin (e.g. "e-District", "NSP"), and abbreviations (ITI, PhD, BPL, SC/ST, OBC, Aadhaar → "आधार" is fine).
- Structure: line breaks (`\n`), bullet markers (`•`), numbered steps. One line in → one line out.
- Text that is cut off with "…" or mid-word: translate what is there and end with "…".

## JSON
- Escape `"` inside text as `\"` and line breaks as `\n`. The file must parse.
- Check a chunk with `cd server && npm run data:translate:merge -- --check NNNN`.
