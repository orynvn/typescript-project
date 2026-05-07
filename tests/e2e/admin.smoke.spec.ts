import { expect, test } from '@playwright/test';

test('admin login page renders', async ({ page }) => {
  await page.goto('http://127.0.0.1:3401/login');
  await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible();
  await expect(page.getByPlaceholder('Email')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});
