// Playwright: "app" drives the built app over WebView2's debug port; "adapter" runs page
// scripts and floawty's own styles against fixtures in Windows' own Edge (no browser download).
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  reporter: 'list',
  workers: 1,
  projects: [
    { name: 'app', testIgnore: ['**/adapters/**', '**/measure/**'] },
    {
      name: 'adapter',
      testMatch: '**/adapters/**/*.spec.ts',
      use: { channel: 'msedge', headless: true },
    },
  ],
});
