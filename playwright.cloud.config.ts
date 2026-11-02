import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base, testMatch: /cloud.spec.ts/, testIgnore: [],
  outputDir: 'test-results-cloud', reporter: [['list']],
  projects: [{ name: 'cloud-desktop', use: { ...devices['Desktop Chrome'] } }],
  use: { ...base.use, baseURL: 'http://127.0.0.1:3001' },
  webServer: { command: 'node node_modules/vite/bin/vite.js --port 3001 --host 127.0.0.1 --strictPort', url: 'http://127.0.0.1:3001', reuseExistingServer: false, stdout: 'pipe', stderr: 'pipe',
    env: { VITE_USE_EMULATORS: 'true', VITE_FIREBASE_API_KEY: 'demo-api-key', VITE_FIREBASE_PROJECT_ID: 'demo-tracify',
      VITE_FIREBASE_AUTH_DOMAIN: 'demo-tracify.firebaseapp.com', VITE_FIREBASE_APP_ID: 'demo-app', VITE_FIREBASE_STORAGE_BUCKET: 'demo-tracify.appspot.com' } },
});
