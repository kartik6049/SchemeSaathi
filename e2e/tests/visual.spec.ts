/**
 * Captures screenshots of key screens into ./screenshots for docs / review.
 * Run: npx playwright test visual
 */
import { test } from '@playwright/test';
import { completeAsFarmer } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ss.lang', '"en"'));
});

test('capture screenshots @mobile', async ({ page }, info) => {
  test.setTimeout(300_000); // full-page captures of long pages are slow
  const shot = (name: string) => page.screenshot({ path: `screenshots/${info.project.name}-${name}.png`, fullPage: true });
  await page.goto('/');
  await shot('home');
  await page.goto('/check');
  await page.getByRole('combobox').selectOption('UP');
  await page.getByRole('radio', { name: /Village/ }).click();
  await shot('questionnaire');
  await completeAsFarmer(page);
  await page.getByText('Occupation: Farmer').first().waitFor();
  await shot('results');
  await page.goto('/schemes/pm-kisan');
  await page.getByRole('button', { name: 'हिं' }).click();
  await page.getByRole('heading', { name: 'लाभ' }).waitFor();
  await shot('detail-hi');
  await page.getByRole('button', { name: 'EN' }).click();
  await page.goto('/schemes');
  await page.getByRole('link').filter({ hasText: /Scheme|Yojana/ }).first().waitFor();
  await shot('browse');
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.goto('/');
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.getByText('Index of schemes').waitFor();
  await shot('home-dark');
});
