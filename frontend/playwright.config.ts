import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // sync tests mutate shared server state
  retries: 0,
  workers: 1,
  timeout: 90000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'bun run dev',
      cwd: '../backend',
      port: 3000,
      reuseExistingServer: true,
      timeout: 20000,
    },
    {
      command: 'bun --bun vite',
      port: 5173,
      reuseExistingServer: true,
      timeout: 20000,
    },
  ],
});
