// Smoke test: the release build starts and shows floawty's own page with its versions.
import { expect, test } from '@playwright/test';
import { freshProfile, launch } from './app';

test('the app starts and shows its versions', async () => {
  const app = await launch(freshProfile());
  try {
    await expect(app.home.locator('#about')).toHaveText(
      /^floawty \d+\.\d+\.\d+(-rc\.\d+)? · WebView2 \d+\./,
    );
  } finally {
    await app.stop();
  }
});
