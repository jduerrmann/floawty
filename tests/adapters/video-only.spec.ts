// Adapter tests: "video only" lays the player over the page in the YouTube, Twitch and
// Crunchyroll scripts; YouTube Shorts in video-only-shorts.spec.ts.
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  ROOT,
  SETTLE_TIMEOUT,
  YOUTUBE,
  TWITCH,
  CRUNCHYROLL,
  EPISODE,
  open,
  input,
  sync,
  covers,
  rectOf,
  viewport,
  scrollLocked,
  CORNERS,
} from './video-only-helpers';

test.describe('YouTube watch page', () => {
  test('video only lays the player over the whole page', async ({ page }) => {
    await open(page, YOUTUBE, 'watch.html', '/watch?v=abc');
    expect(await sync(page, input(true))).toEqual({ aspect: 'landscape', problems: [] });
    expect(await rectOf(page, '#movie_player')).toEqual(await viewport(page));
    expect(await covers(page, '#movie_player', CORNERS)).toEqual([true, true, true, true]);
    expect(await scrollLocked(page)).toBe(true);
  });

  test('without video only the page stays as it is', async ({ page }) => {
    await open(page, YOUTUBE, 'watch.html', '/watch?v=abc');
    expect(await sync(page, input(false))).toEqual({ aspect: 'landscape', problems: [] });
    expect(await covers(page, '#masthead-container', [[0.5, 0.02]])).toEqual([true]);
    expect(await scrollLocked(page)).toBe(false);
  });

  test('turning video only off restores the page without a reload', async ({ page }) => {
    await open(page, YOUTUBE, 'watch.html', '/watch?v=abc');
    const before = await rectOf(page, '#movie_player');
    await page.evaluate(() => ((window as unknown as { __marker: number }).__marker = 1));
    await sync(page, input(true));
    await sync(page, input(false));
    expect(await rectOf(page, '#movie_player')).toEqual(before);
    expect(await scrollLocked(page)).toBe(false);
    expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(
      1,
    );
  });

  test('only styles are added; no element of the page is removed or added', async ({ page }) => {
    await open(page, YOUTUBE, 'watch.html', '/watch?v=abc');
    const count = () => page.evaluate(() => document.body.querySelectorAll('*').length);
    const before = await count();
    await sync(page, input(true));
    expect(await count()).toBe(before);
  });

  test('a YouTube dialog stays above the player', async ({ page }) => {
    await open(page, YOUTUBE, 'watch.html', '/watch?v=abc');
    await page.evaluate(() => document.querySelector('#dialog')?.removeAttribute('hidden'));
    await sync(page, input(true));
    const dialog = await rectOf(page, '#dialog');
    const center = await page.evaluate(
      (rect) => document.elementFromPoint(rect.x + 5, rect.y + 5)?.id,
      dialog ?? { x: 0, y: 0 },
    );
    expect(center).toBe('dialog');
  });

  test('a missing player keeps the normal page and reports it after the page settled', async ({
    page,
  }) => {
    const errors: Error[] = [];
    page.on('pageerror', (error) => errors.push(error));
    await open(page, YOUTUBE, 'watch-no-player.html', '/watch?v=abc');
    expect(await sync(page, input(true))).toEqual({ aspect: 'landscape', problems: [] });
    await expect
      .poll(() => sync(page, input(true)), { timeout: SETTLE_TIMEOUT })
      .toEqual({ aspect: 'landscape', problems: ['player-missing'] });
    expect(await scrollLocked(page)).toBe(false);
    expect(await page.title()).toBe('Watch without player');
    expect(errors).toEqual([]);
  });

  test('garbage input keeps video only on', async ({ page }) => {
    await open(page, YOUTUBE, 'watch.html', '/watch?v=abc');
    await sync(page, input(true));
    for (const value of [null, {}, { ...input(false), videoOnly: 'no' }]) {
      expect(await sync(page, value)).toEqual({ aspect: 'landscape', problems: [] });
    }
    expect(await rectOf(page, '#movie_player')).toEqual(await viewport(page));
  });

  test('the player is told to resize once per switch, not on every sync', async ({ page }) => {
    await open(page, YOUTUBE, 'watch.html', '/watch?v=abc');
    await page.evaluate(() => {
      const counter = window as unknown as { __resizes: number };
      counter.__resizes = 0;
      window.addEventListener('resize', () => (counter.__resizes += 1));
    });
    for (const on of [true, true, false, false]) await sync(page, input(on));
    expect(await page.evaluate(() => (window as unknown as { __resizes: number }).__resizes)).toBe(
      2,
    );
  });

  test('a missing player is not reported while video only is off', async ({ page }) => {
    await page.clock.install();
    await open(page, YOUTUBE, 'watch-no-player.html', '/watch?v=abc');
    await page.clock.runFor(3000);
    expect(await sync(page, input(false))).toEqual({ aspect: 'landscape', problems: [] });
  });
});

test('on the home page the hidden watch player stays hidden and nothing is reported', async ({
  page,
}) => {
  await page.clock.install();
  await open(page, YOUTUBE, 'home.html', '/');
  await page.clock.runFor(3000);
  expect(await sync(page, input(true))).toEqual({ aspect: 'landscape', problems: [] });
  expect(await covers(page, '#masthead-container', [[0.5, 0.02]])).toEqual([true]);
  expect(await scrollLocked(page)).toBe(false);
});

test('a hidden watch player never covers the page, even on a watch address', async ({ page }) => {
  await open(page, YOUTUBE, 'home.html', '/watch?v=abc');
  await sync(page, input(true));
  expect(await covers(page, '#masthead-container', [[0.5, 0.02]])).toEqual([true]);
  expect(await scrollLocked(page)).toBe(false);
});

test('YouTube hosts other than www (music, m) are left alone', async ({ page }) => {
  await page.clock.install();
  await page.addInitScript({ path: path.join(ROOT, 'dist', 'page', 'youtube.js') });
  await page.route('https://music.youtube.com/**', (route) =>
    route.fulfill({
      path: path.join(ROOT, 'test', 'fixtures', 'youtube', 'watch-no-player.html'),
      contentType: 'text/html',
    }),
  );
  await page.goto('https://music.youtube.com/watch?v=abc');
  await page.clock.runFor(3000);
  expect(await sync(page, input(true))).toEqual({ aspect: 'landscape', problems: [] });
});

test('leaving the watch page for the home page gives the normal page back', async ({ page }) => {
  await open(page, YOUTUBE, 'watch.html', '/watch?v=abc');
  await sync(page, input(true));
  await page.evaluate(() => {
    history.pushState({}, '', '/');
    document.querySelector('ytd-watch-flexy')?.setAttribute('hidden', '');
  });
  await sync(page, input(true));
  expect(await covers(page, '#masthead-container', [[0.5, 0.02]])).toEqual([true]);
  expect(await scrollLocked(page)).toBe(false);
});

test.describe('Twitch', () => {
  test('video only lays the player over navigation, details and chat', async ({ page }) => {
    await open(page, TWITCH, 'channel.html', '/somechannel');
    expect(await sync(page, input(true))).toEqual({ aspect: 'landscape', problems: [] });
    expect(await rectOf(page, '.video-player')).toEqual(await viewport(page));
    expect(await rectOf(page, '.video-ref video')).toEqual(await viewport(page));
    expect(await covers(page, '.video-player', CORNERS)).toEqual([true, true, true, true]);
    expect(await scrollLocked(page)).toBe(true);
  });

  test('turning video only off restores the player', async ({ page }) => {
    await open(page, TWITCH, 'channel.html', '/somechannel');
    const before = await rectOf(page, '.video-player');
    await sync(page, input(true));
    await sync(page, input(false));
    expect(await rectOf(page, '.video-player')).toEqual(before);
  });

  test('a page without a player is left alone and reports nothing', async ({ page }) => {
    await page.clock.install();
    await open(page, TWITCH, 'no-player.html', '/directory/all');
    await page.clock.runFor(3000);
    expect(await sync(page, input(true))).toEqual({ aspect: 'landscape', problems: [] });
    expect(await scrollLocked(page)).toBe(false);
  });

  test('a channel page without its player reports it after the page settled', async ({ page }) => {
    await open(page, TWITCH, 'no-player.html', '/somechannel');
    await expect
      .poll(() => sync(page, input(true)), { timeout: SETTLE_TIMEOUT })
      .toEqual({ aspect: 'landscape', problems: ['player-missing'] });
    expect(await scrollLocked(page)).toBe(false);
  });

  test('garbage input answers a status and keeps video only on', async ({ page }) => {
    await open(page, TWITCH, 'channel.html', '/somechannel');
    await sync(page, input(true));
    for (const value of [null, 'x', {}, { videoOnly: 'yes' }]) {
      expect(await sync(page, value)).toEqual({ aspect: 'landscape', problems: [] });
    }
    expect(await rectOf(page, '.video-player')).toEqual(await viewport(page));
  });

  test('another host gets a frozen no-op bridge', async ({ page }) => {
    await page.addInitScript({ path: path.join(ROOT, 'dist', 'page', 'twitch.js') });
    await page.route('https://id.twitch.tv.example.com/**', (route) =>
      route.fulfill({ body: '<title>x</title>', contentType: 'text/html' }),
    );
    await page.goto('https://id.twitch.tv.example.com/');
    expect(await sync(page, input(true))).toBeNull();
    expect(await page.evaluate(() => Object.isFrozen((window as never)['__floawty']))).toBe(true);
  });
});

test.describe('Crunchyroll', () => {
  test('video only lays the player over the header and the episode page', async ({ page }) => {
    await open(page, CRUNCHYROLL, 'watch.html', EPISODE);
    expect(await sync(page, input(true))).toEqual({ aspect: 'landscape', problems: [] });
    expect(await rectOf(page, '.video-player-wrapper')).toEqual(await viewport(page));
    expect(await rectOf(page, 'video')).toEqual(await viewport(page));
    expect(await covers(page, '.video-player-wrapper', CORNERS)).toEqual([true, true, true, true]);
    expect(await scrollLocked(page)).toBe(true);
  });

  test('turning video only off restores the player', async ({ page }) => {
    await open(page, CRUNCHYROLL, 'watch.html', '/watch/G0000000/episode');
    const before = await rectOf(page, '.video-player-wrapper');
    await sync(page, input(true));
    await sync(page, input(false));
    expect(await rectOf(page, '.video-player-wrapper')).toEqual(before);
    expect(await scrollLocked(page)).toBe(false);
  });

  test('browsing pages are left alone and report nothing', async ({ page }) => {
    await page.clock.install();
    await open(page, CRUNCHYROLL, 'no-player.html', '/de/series/G0000000');
    await page.clock.runFor(3000);
    expect(await sync(page, input(true))).toEqual({ aspect: 'landscape', problems: [] });
    expect(await scrollLocked(page)).toBe(false);
  });

  test('an episode page without its player reports it after the page settled', async ({ page }) => {
    await open(page, CRUNCHYROLL, 'no-player.html', EPISODE);
    await expect
      .poll(() => sync(page, input(true)), { timeout: SETTLE_TIMEOUT })
      .toEqual({ aspect: 'landscape', problems: ['player-missing'] });
  });
});
