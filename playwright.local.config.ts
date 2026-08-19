import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e-local',
  fullyParallel: true,
  retries: 0,
  reporter: [['html', { open: 'never', outputFolder: 'playwright-report/local' }]],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'local-mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'local-desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'npm run db:local',
      url: 'http://127.0.0.1:8787/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
      env: { VITE_LOCAL_BACKEND_URL: 'http://127.0.0.1:8787' },
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
})
