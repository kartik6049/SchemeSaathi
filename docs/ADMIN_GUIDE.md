# Admin guide (for scheme curators)

Open **/admin** and sign in. The first admin account comes from `ADMIN_EMAIL` /
`ADMIN_PASSWORD` in `server/.env` when the database is seeded. Change the default password.

## Dashboard
- **Need re-verification**: active schemes not verified in 180 days (FR-19).
  Check the official portal, update anything that changed, then click **Mark verified**.
- **Usage (last 30 days)**: anonymous counts of checks started and completed,
  scheme views and checklist downloads.
- **Questionnaire steps completed**: compare steps to spot where people drop off.

## Adding a scheme (UC-03)
1. **Schemes → New scheme**.
2. **Details** tab:
   - **Slug**: short URL id, e.g. `pm-kisan`. Avoid changing it later, because shared links use it.
   - **State**: "Central" for all-India schemes. For a state scheme, users from
     other states are excluded automatically.
   - Fill **every text in English and Hindi**. Use plain language: what you get, who can apply, how.
   - **Official link** must be the government `https://` page, never a third-party site.
   - **Benefit size** affects ranking (1 helpful, 2 good, 3 high).
   - **Deadline** is optional. Schemes with a close deadline rank higher.
3. **Eligibility rules** tab:
   - A **group** is a set of conditions that must **all** be true.
   - Add another **OR group** when there are alternative ways to qualify
     (e.g. "BPL card holder" OR "age 70+").
   - Income rules use rupees per year: "income ≤ 250000" means up to ₹2.5 lakh.
     Users pick an income *band*. If the band straddles your limit, they see
     "possibly eligible – confirm with your exact figure".
   - Click **Validate rules**. Invalid rules can never be saved.
4. **Documents** tab: tick everything an applicant should carry.
5. **Preview & test** tab: fill a sample profile and click **Run test** to check the
   result is *Eligible / Possibly eligible / Not eligible* as you expect. Test a
   person who should qualify **and** one who shouldn't.
6. Click **Create scheme**. It appears in citizens' results immediately; no deploy is needed.

## Editing / retiring
- **Edit** any scheme. Saving replaces its rules and documents.
- Use the **power** icon to deactivate a scheme (hidden from citizens, kept for history)
  instead of deleting it.

## Writing good rules — tips
- Only encode what the questionnaire asks. Put conditions it can't check
  (e.g. "has a bank account") in the plain-language eligibility text.
- Prefer slightly broad rules plus clear text over rules that wrongly exclude
  people. Results always say "likely".
- If a new question is truly needed, ask a developer to add a field (see RULES_ENGINE.md).
