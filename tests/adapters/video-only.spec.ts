// Adapter tests: "video only" lays the player over the page in the YouTube and Twitch scripts.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const ROOT = path.join(import.meta.dirname, '..', '..');
const SETTLE_TIMEOUT = 8000;

interface Status {
  aspect: 'portrait' | 'landscape';
  problems: string[];
}

interface Site {
  script: string;
  origin: string;
  fixtures: string;
}

const YOUTUBE: Site = { script: 'youtube', origin: 'https://www.youtube.com', fixtures: 'youtube' };
const TWITCH: Site = { script: 'twitch', origin: 'https://www.twitch.tv', fixtures: 'twitch' };

async function open(page: Page, site: Site, fixture: string, pathname: string): Promise<void> {
  const script = path.join(ROOT, 'dist', 'page', `${site.script}.js`);
  if (!existsSync(script)) throw new Error(`${script} is missing: run npm run build:ui`);
  await page.addInitScript({ path: script });
  await page.route(`${site.origin}/**`, (route) =>
    route.fulfill({
      path: path.join(ROOT, 'test', 'fixtures', site.fixtures, fixture),
      contentType: 'text/html',
    }),
  );
  await page.goto(site.origin + pathname);
}

function input(videoOnly: boolean) {
  return {
    shorts: { auto: false, pauseSeconds: 1, holdOnHover: true },
    hover: false,
    active: true,
    videoOnly,
  };
}

function sync(page: Page, value: unknown): Promise<Status> {
  return page.evaluate(
    (inputValue) =>
      (window as unknown as { __floawty: { sync: (input: unknown) => Status } }).__floawty.sync(
        inputValue,
      ),
    value,
  );
}

/** Whether the topmost element at each point (fractions of the viewport) lies in `selector`. */
function covers(page: Page, selector: string, points: [number, number][]): Promise<boolean[]> {
  return page.evaluate(
    ([inside, list]) =>
      list.map(
        ([x, y]) =>
          document.elementFromPoint(x * innerWidth, y * innerHeight)?.closest(inside) != null,
      ),
    [selector, points] as const,
  );
}

function rectOf(page: Page, selector: string) {
  return page.evaluate((s) => {
    const rect = document.querySelector(s)?.getBoundingClientRect();
    return rect && { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }, selector);
}

function viewport(page: Page) {
  return page.evaluate(() => ({ x: 0, y: 0, width: innerWidth, height: innerHeight }));
}

/** Whether the user can scroll the page; scripts could still scroll it either way. */
function scrollLocked(page: Page): Promise<boolean> {
  return page.evaluate(() => getComputedStyle(document.documentElement).overflowY === 'hidden');
}

const CORNERS: [number, number][] = [
  [0.02, 0.02],
  [0.5, 0.05],
  [0.98, 0.5],
  [0.5, 0.95],
];

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

test.describe('YouTube Shorts', () => {
  test('video only lays the Short over the page, its bar and the next control', async ({
    page,
  }) => {
    await open(page, YOUTUBE, 'shorts.html', '/shorts/short0');
    expect(await sync(page, input(true))).toEqual({ aspect: 'portrait', problems: [] });
    expect(await rectOf(page, '#shorts-player')).toEqual(await viewport(page));
    expect(await covers(page, '#shorts-player', CORNERS)).toEqual([true, true, true, true]);
  });

  test('the auto mode still moves on through the covered next control', async ({ page }) => {
    await open(page, YOUTUBE, 'shorts.html', '/shorts/short0');
    await sync(page, {
      ...input(true),
      shorts: { auto: true, pauseSeconds: 0, holdOnHover: true },
    });
    await page.evaluate(() => document.querySelector('video')?.dispatchEvent(new Event('ended')));
    await expect
      .poll(() =>
        page.evaluate(() =>
          (window as unknown as { __calls: { name: string }[] }).__calls.map((c) => c.name),
        ),
      )
      .toContain('advance');
  });
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
