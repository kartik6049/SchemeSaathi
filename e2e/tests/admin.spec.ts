/**
 * Admin journeys (non-destructive against the dev DB): login guard,
 * dashboard, scheme list, rule validation in the editor (UC-03 step 4).
 */
import { expect, test } from '@playwright/test';

const EMAIL = process.env.ADMIN_EMAIL ?? 'admin@schemesaathi.local';
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'ChangeMe!2026';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ss.lang', '"en"'));
});

test('admin routes require login; wrong password is rejected', async ({ page }) => {
  await page.goto('/admin/schemes');
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toHaveText('Invalid email or password');
});

test('admin logs in, sees dashboard, list, and validates rules', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // bcrypt (cost 12, pure JS) is slow on low-end CPUs under test load
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Stale data/)).toBeVisible();

  await page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Schemes' }).click();
  await expect(page.getByRole('cell', { name: /PM Kisan Samman Nidhi/ })).toBeVisible();

  await page.getByRole('row').filter({ hasText: 'pm-kisan · ' }).getByRole('link', { name: 'Edit' }).click();
  await page.getByRole('tab', { name: /Eligibility rules/ }).click();
  await expect(page.getByLabel('Field').first()).toHaveValue('occupation');
  await page.getByRole('button', { name: 'Validate rules' }).click();
  await expect(page.getByText('All rules are valid.')).toBeVisible();

  await page.getByRole('tab', { name: /Preview/ }).click();
  await page.getByRole('radio', { name: 'Farmer', exact: true }).click();
  await page.getByRole('button', { name: 'Run test' }).click();
  await expect(page.getByText('Eligible', { exact: true })).toBeVisible();
});

test('admin can filter the full catalogue to schemes awaiting review', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 30_000 }); // session cookie is set
  await page.goto('/admin/schemes');
  await page.getByRole('button', { name: 'Needs review' }).click();
  await expect(page).toHaveURL(/review=pending/);
  await expect(page.getByText(/Page 1 of \d+/)).toBeVisible();
  await expect(page.getByText('myScheme import').first()).toBeVisible();
});
