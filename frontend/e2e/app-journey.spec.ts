import { test, expect } from '@playwright/test';

test.describe('End-to-End SwaraLingo User Journey', () => {
  const timestamp = Date.now();
  const testEmail = `e2e_user_${timestamp}@example.com`;
  const testPassword = 'Password123!';
  const testName = `Farid Tester ${timestamp}`;

  test('User can register, view dashboard, add vocabulary chunk, and logout', async ({ page }) => {
    // 1. Visit Landing Page
    await page.goto('/');
    await expect(page.getByText('SwaraLingo', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Master English for')).toBeVisible();

    // 2. Click Sign In
    const signInBtn = page.getByRole('button', { name: /sign in/i }).first();
    await signInBtn.click();

    // 3. Switch to Register form
    await expect(page.getByText('Welcome Back', { exact: false })).toBeVisible();
    const switchRegisterBtn = page.getByRole('button', { name: /don't have an account\? sign up/i });
    await switchRegisterBtn.click();

    await expect(page.getByText('Create Account', { exact: false })).toBeVisible();

    // 4. Fill registration form
    await page.getByPlaceholder('Muhammad Farid').fill(testName);
    await page.getByPlaceholder('name@company.com').fill(testEmail);
    await page.getByPlaceholder('••••••••').fill(testPassword);

    // 5. Submit registration
    const submitBtn = page.getByRole('button', { name: 'Sign Up', exact: true });
    await submitBtn.click();

    // 6. Verify Dashboard / Main View is rendered with logged-in user name
    await expect(page.getByText(testName).first()).toBeVisible({ timeout: 15000 });

    // 7. Navigate to Sentence Chunks tab
    const chunksTabLink = page.getByRole('link', { name: 'Chunks', exact: true });
    await chunksTabLink.click();
    await expect(page.locator('#phrase-input')).toBeVisible({ timeout: 10000 });

    // 8. Add a new Sentence Chunk
    const testPhrase = `Touch base on sprint #${timestamp}`;
    await page.locator('#phrase-input').fill(testPhrase);
    await page.locator('#meaning-input').fill('Berdiskusi singkat tentang sprint');
    await page.locator('#example-input').fill("Let's touch base on the sprint tomorrow.");

    const saveChunkBtn = page.getByRole('button', { name: /add to chunks bank/i });
    await saveChunkBtn.click();

    // 9. Verify the chunk is saved and listed in Saved Chunks List
    await expect(page.getByText(testPhrase)).toBeVisible({ timeout: 10000 });

    // 10. Open User Dropdown and Logout
    const profileDropdownBtn = page.locator('header').getByRole('button').filter({ hasText: testName });
    await profileDropdownBtn.click();

    const logoutBtn = page.getByRole('button', { name: /logout account/i });
    await logoutBtn.click();

    // 11. Verify returned to Landing Page
    await expect(page.getByText('Master English for')).toBeVisible({ timeout: 10000 });
  });
});
