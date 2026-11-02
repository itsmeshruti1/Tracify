import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
const localChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

export default defineConfig({
  testDir: './tests/e2e', testIgnore: /cloud.spec.ts/, fullyParallel: false, workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]], timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
      (process.platform === 'win32' && existsSync(localChrome) ? localChrome : undefined) } },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1050 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: { command: 'node node_modules/vite/bin/vite.js preview --port 4173 --host 127.0.0.1 --strictPort',
    url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI, stdout: 'pipe', stderr: 'pipe' },
});
