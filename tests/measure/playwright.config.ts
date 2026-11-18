// Measures the release build against the budgets with spikes/measure; `npm run measure`, not part of verify.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 15 * 60_000,
  reporter: 'list',
  workers: 1,
});
