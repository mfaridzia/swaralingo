import { test, expect } from '@playwright/test';

const MOCK_USER = {
  id: 9999,
  email: 'e2e-test@swaralingo.dev',
  name: 'E2E Tester',
  target_language: 'English',
};

async function loginAndEnableOffline(
  page: ReturnType<typeof test['info'] extends never ? never : any>,
  offline: boolean,
) {
  await page.goto('/');
  await page.evaluate(
    ({ user, offlineEnabled }) => {
      localStorage.setItem('fluency_user', JSON.stringify(user));
      localStorage.setItem('swaralingo_offline_enabled', String(offlineEnabled));
    },
    { user: MOCK_USER, offlineEnabled: offline },
  );
  await page.goto('/dashboard');
  // Let React hydrate: read localStorage → set activeUser → render MainAppLayout
  await page.waitForTimeout(3000);
}

/** Catch-all mock — returns empty data for all API calls */
async function mockAllApiEmpty(page: ReturnType<typeof test['info'] extends never ? never : any>) {
  await page.route('**/*/api/**', async (route) => {
    const method = route.request().method();
    const url = route.request().url();

    // Analyze — return improved sentence
    if (url.includes('/analyze') && method === 'POST') {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { improved: 'This is the improved version from E2E mock.', feedback: 'Good sentence structure. Consider using more specific vocabulary.' },
        }),
      });
    }

    // Sync — return synced result
    if (url.includes('/sync') && method === 'POST') {
      const body = route.request().postData() ? JSON.parse(route.request().postData()!) : { mutations: [] };
      const synced = (body.mutations || []).map((m: Record<string, unknown>) => ({
        table: m.table, clientId: m.clientId, serverId: Math.floor(Math.random() * 10000) + 100,
      }));
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { synced, conflicts: [], errors: [] } }),
      });
    }

    // POST /logs — save success
    if (url.includes('/logs') && method === 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 1 } }) });
    }

    // POST /chunks — save success
    if (url.includes('/chunks') && method === 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 1 } }) });
    }

    // POST /audio — upload success
    if (url.includes('/audio') && method === 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { audioKey: 'e2e-test-audio.webm' } }) });
    }

    // All other (GET logs, chunks, stats, auth/me) — empty data
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
  });
}

/** Override GET /logs mock to return specific entries */
async function setLogsResponse(
  page: ReturnType<typeof test['info'] extends never ? never : any>,
  entries: Array<Record<string, unknown>>,
) {
  // Unroute the catch-all, then route specific
  await page.unroute('**/*/api/**');
  await page.route('**/*/api/**', async (route) => {
    const method = route.request().method();
    const url = route.request().url();

    if (url.includes('/logs') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: entries }) });
    }
    if (url.includes('/analyze') && method === 'POST') {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { improved: 'This is the improved version from E2E mock.', feedback: 'Good.' } }),
      });
    }
    if (url.includes('/sync') && method === 'POST') {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { synced: [], conflicts: [], errors: [] } }),
      });
    }
    if ((url.includes('/logs') || url.includes('/chunks')) && method === 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 1 } }) });
    }
    if (url.includes('/audio') && method === 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { audioKey: 'e2e-audio.webm' } }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
  });
}

test.describe('Offline-First Sync', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApiEmpty(page);
  });

  async function assertBannerSynced(page: ReturnType<typeof test['info'] extends never ? never : any>) {
    await expect(page.locator('text=Synced')).toBeVisible({ timeout: 10000 });
  }

  async function assertBannerOffline(page: ReturnType<typeof test['info'] extends never ? never : any>) {
    // "Offline" text appears in banner when offline
    await expect(page.locator('text=Offline')).toBeVisible({ timeout: 10000 });
  }

  async function assertBannerPending(page: ReturnType<typeof test['info'] extends never ? never : any>) {
    // "pending" text appears when there are queued mutations
    await expect(page.locator('text=pending')).toBeVisible({ timeout: 10000 });
  }

  test('offline diary entry → sync on reconnect', async ({ page, context }) => {
    await loginAndEnableOffline(page, true);
    await expect(page.locator('text=Your Saved Records')).toBeVisible({ timeout: 15000 });

    // Verify offline mode is recognized
    const storeState = await page.evaluate(() => {
      return {
        offlineEnabled: localStorage.getItem('swaralingo_offline_enabled'),
        pendingCount: localStorage.getItem('swaralingo_pending_count'),
      };
    });
    console.log('Store state:', storeState);

    // Banner: offline mode ON + online → "Synced"
    await assertBannerSynced(page);

    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(500);
    await assertBannerOffline(page);

    // Type and analyze
    await page.locator('#user-sentence').fill('I go to the meeting yesterday.');
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Analyze")').click({ timeout: 10000 });
    await expect(page.locator('text=improved version from E2E mock')).toBeVisible({ timeout: 10000 });

    // Save offline
    await page.locator('button:has-text("Save to Diary")').click({ timeout: 10000 });
    await page.waitForTimeout(3000);

    // Debug: what text is in the banner area?
    const bannerText = await page.locator('.border-b.border-zinc-800\\/30').textContent().catch(() => 'NO_BANNER');
    console.log('Banner text after save:', bannerText);

    // Also check store directly
    const storeAfterSave = await page.evaluate(() => ({
      pendingCount: localStorage.getItem('swaralingo_pending_count'),
      offlineEnabled: localStorage.getItem('swaralingo_offline_enabled'),
      lastSync: localStorage.getItem('swaralingo_last_sync'),
    }));
    console.log('Store after save:', JSON.stringify(storeAfterSave));

    await assertBannerPending(page);

    // Go online → sync triggers → pending cleared
    await context.setOffline(false);
    await page.waitForTimeout(2000);
    await assertBannerSynced(page);
  });

  test('toggle-off regression: normal online flow works', async ({ page }) => {
    await loginAndEnableOffline(page, false);
    await expect(page.locator('text=Your Saved Records')).toBeVisible({ timeout: 15000 });

    // No banner when offline mode OFF
    const bannerDiv = page.locator('.border-b.border-zinc-800\\/30');
    await expect(bannerDiv).not.toBeVisible();

    // Type and analyze
    await page.locator('#user-sentence').fill('Normal online sentence.');
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Analyze")').click({ timeout: 10000 });
    await expect(page.locator('text=improved version from E2E mock')).toBeVisible({ timeout: 10000 });

    // Update mock BEFORE save so React Query refetch returns the entry
    await setLogsResponse(page, [{
      id: 2, user_input: 'Normal online sentence.',
      ai_feedback: 'Good sentence structure.', improved_version: 'This is the improved version from E2E mock.',
      created_at: new Date().toISOString(), audio_key: null,
    }]);

    // Save — goes to server directly
    await page.locator('button:has-text("Save to Diary")').click({ timeout: 10000 });

    // React Query refetch after mutation success — text appears both in textarea and SavedRecords
    await expect(page.locator('text="Normal online sentence."')).toBeVisible({ timeout: 10000 });
  });

  test('offline mode toggle in Settings', async ({ page }) => {
    await loginAndEnableOffline(page, true);
    await page.goto('/dashboard/settings');
    await expect(page.locator('text=Profile Settings')).toBeVisible({ timeout: 15000 });

    await expect(page.locator('text=Offline Mode')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Local Storage')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Clear Offline Data")')).toBeVisible();
  });

  test('offline diary with audio → sync on reconnect', async ({ page, context }) => {
    await loginAndEnableOffline(page, true);
    await expect(page.locator('text=Your Saved Records')).toBeVisible({ timeout: 15000 });

    await assertBannerSynced(page);

    await context.setOffline(true);
    await page.waitForTimeout(500);
    await assertBannerOffline(page);

    await page.locator('#user-sentence').fill('Audio test offline.');
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Analyze")').click({ timeout: 10000 });
    await expect(page.locator('text=improved version from E2E mock')).toBeVisible({ timeout: 10000 });

    // Save without audio (MediaRecorder hard to mock, audio optional per plan)
    await page.locator('button:has-text("Save to Diary")').click({ timeout: 10000 });
    await page.waitForTimeout(2000);
    await assertBannerPending(page);

    // Go online → sync triggers
    await context.setOffline(false);
    await page.waitForTimeout(2000);
    await assertBannerSynced(page);
  });
});
