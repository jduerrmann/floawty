// Adapter tests: the TikTok page script against a hand-written feed served on real TikTok URLs.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const SCRIPT = path.join(import.meta.dirname, '..', '..', 'dist', 'page', 'tiktok.js');
const FIXTURES = path.join(import.meta.dirname, '..', '..', 'test', 'fixtures', 'tiktok');
const FEED_URL = 'https://www.tiktok.com/foryou';
const PAUSE_MS = 300;

interface Status {
  aspect: 'portrait' | 'landscape';
  problems: string[];
}

async function open(page: Page, url = FEED_URL): Promise<void> {
  if (!existsSync(SCRIPT)) throw new Error('dist/page/tiktok.js is missing: run npm run build:ui');
  await page.addInitScript({ path: SCRIPT });
  await page.route('https://www.tiktok.com/**', (route) =>
    route.fulfill({ path: path.join(FIXTURES, 'foryou.html'), contentType: 'text/html' }),
  );
  await page.goto(url);
  // Recorded play() and pause() also change the fixture's playing state, as on TikTok.
  await page.evaluate(() => {
    const calls = (window as unknown as { __calls: unknown[] }).__calls;
    for (const video of document.querySelectorAll<HTMLMediaElement>('video, audio')) {
      const fixture = video as HTMLVideoElement & { __playing: boolean };
      video.pause = () => {
        calls.push({ name: `pause ${video.id}`, at: Date.now() });
        fixture.__playing = false;
      };
      video.play = () => {
        calls.push({ name: `play ${video.id}`, at: Date.now() });
        fixture.__playing = true;
        return Promise.resolve();
      };
    }
  });
}

function sync(page: Page, input: unknown): Promise<Status> {
  return page.evaluate(
    (value) =>
      (window as unknown as { __floawty: { sync: (input: unknown) => Status } }).__floawty.sync(
        value,
      ),
    input,
  );
}

function config(auto: boolean, pauseSeconds: number, hover = false) {
  return {
    shorts: { auto, pauseSeconds, holdOnHover: true },
    hover,
    active: true,
    videoOnly: false,
  };
}

function callNames(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    (window as unknown as { __calls: { name: string }[] }).__calls.map((call) => call.name),
  );
}

function playing(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLMediaElement>('video, audio')]
      .filter((video) => !video.paused)
      .map((v) => v.id),
  );
}

function end(page: Page, id: string): Promise<void> {
  return page.evaluate((videoId) => {
    (window as unknown as { __end: (id: string) => void }).__end(videoId);
  }, id);
}

function show(page: Page, index: number): Promise<void> {
  return page.evaluate((item) => {
    (window as unknown as { __show: (index: number) => void }).__show(item);
  }, index);
}

function slide(page: Page, index: number, mediaId = 'music'): Promise<void> {
  return page.evaluate(
    ([picture, id]) => {
      (window as unknown as { __slide: (index: number, id: string) => void }).__slide(picture, id);
    },
    [index, mediaId] as const,
  );
}

function advances(page: Page): Promise<number> {
  return callNames(page).then((names) => names.filter((name) => name === 'advance').length);
}

test('a video that ends is paused, TikTok restarting it is paused again, then it moves on', async ({
  page,
}) => {
  await open(page);
  await sync(page, config(true, PAUSE_MS / 1000));
  await end(page, 'first');
  expect(await callNames(page)).toEqual(['pause first', 'pause first']);
  expect(await playing(page)).toEqual([]);
  await expect.poll(() => callNames(page)).toEqual(['pause first', 'pause first', 'advance']);
  expect(await playing(page)).toEqual(['second']);
});

test('without a pause exactly the next video plays after an end', async ({ page }) => {
  await open(page);
  await sync(page, config(true, 0));
  await end(page, 'first');
  await expect.poll(() => advances(page)).toBe(1);
  expect(await playing(page)).toEqual(['second']);
  await end(page, 'second');
  await expect.poll(() => advances(page)).toBe(2);
});

test('the current video starting to load again does not cancel the pause', async ({ page }) => {
  await open(page);
  await sync(page, config(true, PAUSE_MS / 1000));
  await end(page, 'first');
  await page.evaluate(() =>
    document.querySelector('#first')?.dispatchEvent(new Event('loadstart')),
  );
  await expect.poll(() => advances(page)).toBe(1);
});

test('scrolling on during the pause replaces the automatic move', async ({ page }) => {
  await page.clock.install();
  await open(page);
  await sync(page, config(true, 1));
  await end(page, 'first');
  await show(page, 1);
  await page.clock.runFor(1500);
  expect(await advances(page)).toBe(0);
  expect(await playing(page)).toEqual(['second']);
});

test('a photo series moves on once its music has run, like a video', async ({ page }) => {
  await open(page);
  await sync(page, config(true, 0));
  await show(page, 2);
  await end(page, 'music');
  await expect.poll(() => advances(page)).toBe(1);
  expect(await playing(page)).toEqual([]);
});

test('a photo series moves on once all its pictures were shown', async ({ page }) => {
  await open(page);
  await sync(page, config(true, 0));
  await show(page, 2);
  // The music samples each picture, the first one too.
  for (const index of [0, 1, 2]) await slide(page, index);
  expect(await advances(page)).toBe(0);
  await slide(page, 0);
  await expect.poll(() => advances(page)).toBe(1);
});

test('a video never ends at the turn of a slideshow elsewhere on the page', async ({ page }) => {
  await open(page);
  await sync(page, config(true, 0));
  for (const index of [1, 2, 0, 1]) await slide(page, index, 'first');
  await page.waitForTimeout(200);
  expect(await advances(page)).toBe(0);
});

test('on an item without any media the auto mode never starts another one', async ({ page }) => {
  await page.clock.install();
  await open(page);
  await sync(page, config(true, 0));
  await show(page, 2);
  await end(page, 'music');
  // The click shows item 3, which has no media; the blocked timeout then plays nothing.
  await page.clock.runFor(4000);
  expect(await advances(page)).toBe(1);
  expect(await playing(page)).toEqual([]);
  expect((await callNames(page)).filter((name) => name.startsWith('play'))).toEqual([]);
});

test('the mouse over floawty holds the feed at the end of a video', async ({ page }) => {
  await page.clock.install();
  await open(page);
  await sync(page, config(true, 0, true));
  await end(page, 'first');
  await page.clock.runFor(1000);
  expect(await advances(page)).toBe(0);
});

test('the feed is portrait, other TikTok pages are landscape', async ({ page }) => {
  await open(page);
  expect((await sync(page, config(false, 1))).aspect).toBe('portrait');
  await page.evaluate(() => history.pushState({}, '', '/explore'));
  expect((await sync(page, config(false, 1))).aspect).toBe('landscape');
});

test('a feed where nothing has played yet reports no problem', async ({ page }) => {
  await page.clock.install();
  await open(page, `${FEED_URL}?idle`);
  await page.clock.runFor(2100);
  expect(await sync(page, config(true, 0))).toEqual({ aspect: 'portrait', problems: [] });
});

test('a missing next control is reported once the feed has settled', async ({ page }) => {
  await open(page);
  await page.evaluate(() => document.querySelector('[data-e2e="feed-navigation-next"]')?.remove());
  await expect
    .poll(() => sync(page, config(true, 0)), { timeout: 8000 })
    .toEqual({ aspect: 'portrait', problems: ['controls-missing'] });
});

test('hidden arrows, as in the upright layout, still move on without a warning', async ({
  page,
}) => {
  // TikTok hides its arrows in narrow windows, and a click on the hidden one pages (live 2026-11-21).
  await open(page);
  await page.evaluate(() => {
    document
      .querySelector<HTMLElement>('[data-e2e="feed-navigation-next"]')
      ?.style.setProperty('display', 'none');
  });
  await sync(page, config(true, 0));
  await end(page, 'first');
  await expect.poll(() => advances(page)).toBe(1);
  expect((await sync(page, config(true, 0))).problems).toEqual([]);
});
