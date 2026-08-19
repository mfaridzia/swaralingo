import { test, expect } from '@playwright/test';

test.describe('End-to-End Practice Diary Flow', () => {
  const timestamp = Date.now();
  const testEmail = `diary_user_${timestamp}@example.com`;
  const testPassword = 'Password123!';
  const testName = `Diary Tester ${timestamp}`;

  test('User can input sentence, detect vocal fillers, analyze grammar, and save to diary records', async ({ page }) => {
    // 1. Visit landing and register
    await page.goto('/');
    await page.getByRole('button', { name: /sign in/i }).first().click();

    await page.getByRole('button', { name: /don't have an account\? sign up/i }).click();
    await page.getByPlaceholder('Muhammad Farid').fill(testName);
    await page.getByPlaceholder('name@company.com').fill(testEmail);
    await page.getByPlaceholder('••••••••').fill(testPassword);
    await page.getByRole('button', { name: 'Sign Up', exact: true }).click();

    // 2. Verify on Diary page
    await expect(page.getByText(testName).first()).toBeVisible({ timeout: 15000 });
    const diaryInput = page.locator('#user-sentence');
    await expect(diaryInput).toBeVisible();

    // 3. Input sentence with filler word
    const testSentence = `I goes to the office yesterday and, like, deploy the server.`;
    await diaryInput.fill(testSentence);

    // 4. Verify vocal filler warning is displayed
    await expect(page.getByText(/Vocal Fillers Detected/i)).toBeVisible();
    await expect(page.getByText('"like" x 1')).toBeVisible();

    // 5. Click Analyze & Naturalize
    const analyzeBtn = page.getByRole('button', { name: /analyze & naturalize/i });
    await analyzeBtn.click();

    // 6. Verify AI Coach feedback panel appears
    await expect(page.getByText('AI Speaking Coach')).toBeVisible({ timeout: 15000 });

    // 7. Save to Diary
    const saveBtn = page.getByRole('button', { name: /save to diary/i });
    await saveBtn.click();

    // 8. Verify saved record appears in Saved Diary Logs list
    await expect(page.getByText(testSentence).first()).toBeVisible({ timeout: 10000 });
  });
});
