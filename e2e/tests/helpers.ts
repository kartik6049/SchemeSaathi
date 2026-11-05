import { expect, type Page } from '@playwright/test';

/**
 * Answers the questionnaire as a 35-year-old male farmer from MP.
 * Steps (conditional questions hidden for this profile: pregnancy, construction-worker board):
 *  1 state+area · 2 age+gender · 3 marital · 4 occupation · 5 income+tax · 6 category+minority
 *  7 student+education · 8 disability+BPL · 9 ex-serviceman+girl child
 * `skipOptional` answers only state, age, gender and occupation and skips the rest.
 */
export async function completeAsFarmer(page: Page, { skipOptional = false } = {}) {
  await page.goto('/check');
  await page.getByRole('combobox').selectOption('MP');
  await page.getByRole('radio', { name: /Village/ }).click();
  await next(page);
  await page.getByRole('textbox').fill('35');
  await page.getByRole('radio', { name: 'Male', exact: true }).click();
  await next(page);

  if (skipOptional) {
    await skip(page); // marital status
    await page.getByRole('radio', { name: 'Farmer', exact: true }).click();
    await next(page);
    for (let i = 0; i < 5; i++) await skip(page); // income … special groups (last skip opens results)
    return;
  }

  await page.getByRole('radio', { name: 'Married', exact: true }).click();
  await next(page);
  await page.getByRole('radio', { name: 'Farmer', exact: true }).click();
  await next(page);
  await page.getByRole('radio', { name: /₹1 – 2.5 lakh/ }).click();
  await page.getByRole('radiogroup').nth(1).getByRole('radio', { name: 'No' }).click();
  await next(page);
  await page.getByRole('radio', { name: 'OBC', exact: true }).click();
  await page.getByRole('radiogroup').nth(1).getByRole('radio', { name: 'No' }).click();
  await next(page);
  await page.getByRole('radiogroup').nth(0).getByRole('radio', { name: 'No' }).click();
  await page.getByRole('radio', { name: 'Class 9 – 10' }).click();
  await next(page);
  await page.getByRole('radiogroup').nth(0).getByRole('radio', { name: 'No' }).click();
  await page.getByRole('radiogroup').nth(1).getByRole('radio', { name: 'No' }).click();
  await next(page);
  await page.getByRole('radiogroup').nth(0).getByRole('radio', { name: 'No' }).click();
  await page.getByRole('radiogroup').nth(1).getByRole('radio', { name: 'No' }).click();
  await page.getByRole('button', { name: 'See my schemes' }).click();
}

async function next(page: Page) {
  const btn = page.getByRole('button', { name: 'Next' });
  await expect(btn).toBeEnabled();
  await btn.click();
}

async function skip(page: Page) {
  await page.getByRole('button', { name: 'Skip' }).click();
}
