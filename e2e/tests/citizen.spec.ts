/**
 * Citizen journeys: E2E-01 (questionnaire -> results), E2E-02 (detail page),
 * E2E-03 (Hindi), plus skip -> "possibly eligible", search and checklist.
 */
import { expect, test } from '@playwright/test';
import { completeAsFarmer } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e-init')) {
      localStorage.clear();
      localStorage.setItem('ss.lang', '"en"');
      sessionStorage.setItem('e2e-init', '1');
    }
  });
});

test('E2E-01: farmer completes the questionnaire and sees ranked results @mobile', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Check my eligibility/ }).first().click();
  await expect(page).toHaveURL(/\/check/);
  await completeAsFarmer(page);

  await expect(page).toHaveURL(/\/results\?p=/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('You are likely eligible for');
  await expect(page.getByRole('note')).toContainText('Results show likely eligibility');
  const kisan = page.getByRole('link', { name: 'PM Kisan Samman Nidhi (PM-KISAN)' });
  await expect(kisan).toBeVisible();
  await expect(page.getByText('Occupation: Farmer').first()).toBeVisible();
  // No login was required anywhere (FR-02)
  await expect(page.getByText(/sign in/i)).toHaveCount(0);
});

test('required questions block progress; Back keeps answers (FR-03)', async ({ page }) => {
  await page.goto('/check');
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
  await page.getByRole('combobox').selectOption('UP');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('combobox')).toHaveValue('UP');
  // Progress survives a reload (FR-04)
  await page.reload();
  await expect(page.getByRole('combobox')).toHaveValue('UP');
});

test('skipped questions produce "possibly eligible" with an answer-now link', async ({ page }) => {
  await completeAsFarmer(page, { skipOptional: true });
  await expect(page).toHaveURL(/\/results/);
  await page.getByRole('tab', { name: /Possibly eligible/ }).click();
  await expect(page.getByText('Answer to confirm:').first()).toBeVisible();
  // Each missing answer links straight to its question
  await page.locator('a[href^="/check?step="]').first().click();
  await expect(page).toHaveURL(/\/check/);
});

test('E2E-02: scheme detail shows benefits, documents and the official link', async ({ page }) => {
  await completeAsFarmer(page);
  await page.getByRole('link', { name: 'PM Kisan Samman Nidhi (PM-KISAN)' }).click();
  await expect(page).toHaveURL(/\/schemes\/pm-kisan/);
  await expect(page.getByRole('heading', { name: 'Benefits' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Documents needed' })).toBeVisible();
  await expect(page.getByText(/Land ownership records/)).toBeVisible();
  const official = page.getByRole('link', { name: /Apply on official website/ });
  await expect(official).toHaveAttribute('href', 'https://pmkisan.gov.in');
  await expect(official).toHaveAttribute('rel', /noopener/);
  await expect(page.getByText('Last verified')).toBeVisible();
});

test('E2E-03: switching to Hindi translates UI and scheme content, and persists', async ({ page }) => {
  await page.goto('/schemes/pm-kisan');
  await page.getByRole('button', { name: 'हिं' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('प्रधानमंत्री किसान सम्मान निधि (पीएम-किसान)');
  await expect(page.getByRole('heading', { name: 'लाभ' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'लाभ' })).toBeVisible();
});

test('checklist combines documents across selected schemes (UC-02)', async ({ page }) => {
  await completeAsFarmer(page);
  await page.getByRole('button', { name: 'Select all' }).click();
  // Desktop: the summary rail (the mobile bar is hidden at this width)
  const rail = page.getByRole('complementary');
  await expect(rail.getByText(/schemes selected/)).toBeVisible();
  await rail.getByRole('button', { name: 'View checklist' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Documents to carry' })).toBeVisible();
  // Aadhaar appears once even though many schemes need it
  await expect(dialog.getByText('Aadhaar card (for identity / e-KYC)')).toHaveCount(1);
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download PDF' }).click();
  expect((await download).suggestedFilename()).toBe('schemesaathi-checklist-en.pdf');
});

test('browse: search and filter schemes (FR-11) @mobile', async ({ page }) => {
  await page.goto('/schemes');
  await page.getByRole('searchbox').fill('scholarship');
  await expect(page).toHaveURL(/q=scholarship/);
  await expect(page.getByRole('link', { name: /Post-Matric Scholarship for SC Students/ }).first()).toBeVisible();
  await page.getByRole('searchbox').fill('');
  // On phones the filter index is collapsed behind a toggle
  const toggle = page.getByRole('button', { name: /Subject/ });
  if (await toggle.isVisible()) await toggle.click();
  await page.getByRole('button', { name: /^Agriculture/ }).click();
  await expect(page.getByRole('link', { name: /Soil Health Card Scheme/ }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Post-Matric Scholarship/ })).toHaveCount(0);
});

test('full catalogue: imported state schemes appear with provenance @mobile', async ({ page }) => {
  await page.goto('/schemes?state=JH&q=pension');
  const row = page.getByRole('link', { name: /Annath Pension Yojana/ }).first();
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Annath Pension');
  await expect(page.getByRole('note').first()).toContainText('imported automatically');
  await expect(page.getByRole('link', { name: /Apply on official website/ })).toHaveAttribute('href', /myscheme\.gov\.in\/schemes\//);
});
