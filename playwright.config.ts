// Playwright: "app" drives the built app over WebView2's debug port; "adapter" runs page
// scripts against fixtures in the Edge that ships with Windows (no browser download).
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  reporter: 'list',
  workers: 1,
  projects: [
    { name: 'app', testIgnore: '**/adapters/**' },
    {
      name: 'adapter',
      testMatch: '**/adapters/**/*.spec.ts',
      use: { channel: 'msedge', headless: true },
    },
  ],
});
