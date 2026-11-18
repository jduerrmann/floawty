// The shell around the YouTube page script: turning the overlay, window mode, the warn dot.
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
    const missing = route.request().url().includes('/missing');
    const file = missing ? 'shorts-no-next.html' : 'shorts.html';
    return route.fulfill({ path: path.join(FIXTURES, file), contentType: 'text/html' });
  });
  return page;
}

function size(app: RunningApp): Promise<[number, number]> {
  return app.home.evaluate(() => [window.outerWidth, window.outerHeight] as [number, number]);
}

test('a Short turns the floaty view upright and leaving it restores the size', async () => {
  const app = await launch(freshProfile());
  try {
    const page = await openYoutubeOnFixtures(app);
    const landscape = await size(app);
    await page.goto('https://www.youtube.com/shorts/first');
    await expect.poll(() => size(app)).toEqual([landscape[1], landscape[0]]);
    await page.goto('https://www.youtube.com/watch?v=other');
    await expect.poll(() => size(app)).toEqual(landscape);
  } finally {
    await app.stop();
  }
});

test('window mode never turns, and missing controls show the dot and log once', async () => {
  const profile = freshProfile();
  const app = await launch(profile);
  try {
    const page = await openYoutubeOnFixtures(app);
    // Over a service the bar only shows on hover, so the command is called directly.
    await app.bar.evaluate(() => window.__TAURI_INTERNALS__.invoke('toggle_mode'));
    const windowSize = await size(app);
    await page.goto('https://www.youtube.com/shorts/missing-1');
    await expect(app.bar.locator('#shorts')).toHaveClass(/problem/, { timeout: 10_000 });
    expect(await size(app)).toEqual(windowSize);
    await page.goto('https://www.youtube.com/shorts/fine');
    await expect(app.bar.locator('#shorts')).not.toHaveClass(/problem/, { timeout: 10_000 });
    await page.goto('https://www.youtube.com/shorts/missing-2');
    await expect(app.bar.locator('#shorts')).toHaveClass(/problem/, { timeout: 10_000 });
  } finally {
    await app.stop();
  }
  const log = readFileSync(path.join(profile.dataDir, 'logs', 'floawty.log'), 'utf8');
  expect(log.match(/controls are missing/g)).toHaveLength(1);
});
