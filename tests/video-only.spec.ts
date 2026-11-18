// The shell around "video only": the switch, the floaty view only, the warn dot and the saved setting.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { freshProfile, launch, type RunningApp } from './app';

const FIXTURES = path.join(import.meta.dirname, '..', 'test', 'fixtures', 'youtube');

async function openYoutubeOnFixtures(app: RunningApp): Promise<Page> {
  await app.bar.evaluate(() =>
    window.__TAURI_INTERNALS__.invoke('open_service', {
      service: {
        id: 'youtube',
        url: 'https://example.com/',
        allowedDomains: ['example.com', 'youtube.com'],
      },
    }),
  );
  let service: Page | undefined;
  await expect
    .poll(() => (service = app.pages().find((page) => page.url().includes('example.com'))))
    .toBeTruthy();
  const page = service as Page;
  // Real YouTube is never contacted: every youtube.com address answers with a fixture.
  await page.route('https://www.youtube.com/**', (route) => {
    const missing = route.request().url().includes('missing');
    const file = missing ? 'watch-no-player.html' : 'watch.html';
    return route.fulfill({ path: path.join(FIXTURES, file), contentType: 'text/html' });
  });
  return page;
}

// Over a service the bar only shows on hover, so its commands are called directly.
function invoke(app: RunningApp, command: string): Promise<unknown> {
  return app.bar.evaluate((name) => window.__TAURI_INTERNALS__.invoke(name), command);
}

function covered(page: Page): Promise<boolean> {
  return page.evaluate(() => document.elementFromPoint(5, 5)?.closest('#movie_player') != null);
}

test('▣ covers the page in the floaty view and window mode shows the whole page', async () => {
  const profile = freshProfile();
  const app = await launch(profile);
  try {
    const page = await openYoutubeOnFixtures(app);
    await page.goto('https://www.youtube.com/watch?v=abc');
    await expect(app.bar.locator('#video-only')).toBeVisible();
    await expect(app.bar.locator('#video-only')).toHaveAttribute('aria-pressed', 'false');
    // The bar webview is hidden without hover, so the click is dispatched, not done by the mouse.
    await app.bar.locator('#video-only').dispatchEvent('click');
    await expect(app.bar.locator('#video-only')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => covered(page)).toBe(true);
    await invoke(app, 'toggle_mode');
    await expect.poll(() => covered(page)).toBe(false);
    await invoke(app, 'toggle_mode');
    await expect.poll(() => covered(page)).toBe(true);
    await invoke(app, 'toggle_video_only');
    await expect.poll(() => covered(page)).toBe(false);
    await invoke(app, 'toggle_video_only');
  } finally {
    await app.stop();
  }
  const settings = readFileSync(path.join(profile.dataDir, 'settings.json'), 'utf8');
  expect(JSON.parse(settings).videoOnly).toBe(true);
});

test('▣ is offered on YouTube only, not on other pages', async () => {
  const app = await launch(freshProfile());
  try {
    await app.bar.evaluate(() =>
      window.__TAURI_INTERNALS__.invoke('open_service', {
        service: { id: 'example', url: 'https://example.com/', allowedDomains: ['example.com'] },
      }),
    );
    await expect(app.bar.locator('#back')).toBeVisible();
    await expect(app.bar.locator('#video-only')).toBeHidden();
  } finally {
    await app.stop();
  }
});

test('a missing player shows the dot on ▣ and is logged once', async () => {
  const profile = freshProfile();
  const app = await launch(profile);
  try {
    const page = await openYoutubeOnFixtures(app);
    await invoke(app, 'toggle_video_only');
    await page.goto('https://www.youtube.com/watch?v=missing-1');
    await expect(app.bar.locator('#video-only')).toHaveClass(/problem/, { timeout: 10_000 });
    await page.goto('https://www.youtube.com/watch?v=fine');
    await expect(app.bar.locator('#video-only')).not.toHaveClass(/problem/, { timeout: 10_000 });
    await page.goto('https://www.youtube.com/watch?v=missing-2');
    await expect(app.bar.locator('#video-only')).toHaveClass(/problem/, { timeout: 10_000 });
  } finally {
    await app.stop();
  }
  const log = readFileSync(path.join(profile.dataDir, 'logs', 'floawty.log'), 'utf8');
  expect(log.match(/video only cannot find the player/g)).toHaveLength(1);
});
