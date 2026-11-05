/**
 * Playwright config. Starts the API and the Vite dev server (or reuses
 * running ones) and drives the locally installed Google Chrome
 * (`channel: 'chrome'`) — Playwright's bundled Chromium doesn't support
 * macOS 13, which this project was built on.
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chrome' }, grep: /@mobile/ },
  ],
  webServer: [
    { command: 'npm --prefix ../server run dev', url: 'http://127.0.0.1:4000/api/health', reuseExistingServer: true, timeout: 60_000 },
    { command: 'npm --prefix ../client run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: true, timeout: 60_000 },
  ],
});
