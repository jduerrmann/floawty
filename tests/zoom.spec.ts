// The shell around the zoom: the ⤢ switch, the shape of the overlay and the floaty view only.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { freshProfile, launch, type Profile, type RunningApp } from './app';
import { resizeWindow } from './desktop';

const PLAYER = path.join(import.meta.dirname, '..', 'test', 'fixtures', 'zoom', 'player.html');

async function openPlayer(app: RunningApp): Promise<Page> {
  await app.home.evaluate(() =>
    window.__TAURI_INTERNALS__.invoke('open_service', {
      service: {
        id: 'example',
        url: 'https://example.com/watch?w=320&h=180',
        allowedDomains: ['example.com'],
      },
    }),
  );
  let found: Page | undefined;
  await expect
    .poll(() => (found = app.pages().find((page) => page.url().startsWith('https://example.com'))))
    .toBeTruthy();
  const page = found as Page;
  await page.route('https://example.com/**', (route) =>
    route.fulfill({ path: PLAYER, contentType: 'text/html' }),
  );
  await page.reload();
  return page;
}

function savedRatio(profile: Profile): number | null {
  try {
    const { floaty } = JSON.parse(
      readFileSync(path.join(profile.dataDir, 'settings.json'), 'utf8'),
    );
    return floaty ? Math.round((floaty.width / floaty.height) * 100) : null;
  } catch {
    return null;
  }
}

const transform = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.querySelector('video') as Element).transform);

test('⤢ zooms a wide floaty overlay, keeps the shape, and window mode shows the page as it is', async () => {
  const profile = freshProfile();
  const app = await launch(profile);
  try {
    const page = await openPlayer(app);
    await expect(app.bar.locator('#zoom')).toBeVisible();
    await expect(app.bar.locator('#zoom')).toHaveAttribute('aria-pressed', 'false');
    // 2:1 lies between the magnets, so it must stay as dragged.
    resizeWindow(app.pid, 900, 450);
    // Settling saves the shape; a magnet would have changed it before saving.
    await expect.poll(() => savedRatio(profile)).toBe(200);
    expect(await app.home.evaluate(() => Math.round((innerWidth / innerHeight) * 100))).toBe(200);
    expect(await transform(page)).toBe('none');
    await app.bar.locator('#zoom').dispatchEvent('click');
    await expect(app.bar.locator('#zoom')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => transform(page)).not.toBe('none');
    await app.bar.evaluate(() => window.__TAURI_INTERNALS__.invoke('toggle_mode'));
    await expect.poll(() => transform(page)).toBe('none');
    await app.bar.evaluate(() => window.__TAURI_INTERNALS__.invoke('toggle_mode'));
    await expect.poll(() => transform(page)).not.toBe('none');
  } finally {
    await app.stop();
  }
  const saved = JSON.parse(readFileSync(path.join(profile.dataDir, 'settings.json'), 'utf8'));
  expect(saved.zoom).toBe(true);
});
