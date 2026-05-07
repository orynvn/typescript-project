import { expect, test } from '@playwright/test';

test('web about page renders', async ({ page }) => {
  await page.goto('http://127.0.0.1:3402/about');
  await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();
  await expect(page.getByText('About page scaffold.')).toBeVisible();
});
