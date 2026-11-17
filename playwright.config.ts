// Playwright drives the built app over WebView2's debug port; no browser download needed.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  reporter: 'list',
});
