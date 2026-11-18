// Adapter tests: the YouTube page script against hand-written fixtures served on real YouTube URLs.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const SCRIPT = path.join(import.meta.dirname, '..', '..', 'dist', 'page', 'youtube.js');
const FIXTURES = path.join(import.meta.dirname, '..', '..', 'test', 'fixtures', 'youtube');
const SHORT_URL = 'https://www.youtube.com/shorts/short0';
const PAUSE_MS = 300;

interface Status {
  aspect: 'portrait' | 'landscape';
  problems: ('controls-missing' | 'player-missing')[];
}
interface Call {
  name: 'pause' | 'play' | 'advance';
  at: number;
}

async function open(page: Page, fixture: string, url = SHORT_URL): Promise<void> {
  if (!existsSync(SCRIPT)) throw new Error('dist/page/youtube.js is missing: run npm run build:ui');
  await page.addInitScript({ path: SCRIPT });
  await page.route('https://www.youtube.com/**', (route) => {
    const embedded = new URL(route.request().url()).pathname.startsWith('/embed/');
    const file = path.join(FIXTURES, embedded ? 'blank.html' : fixture);
    return route.fulfill({ path: file, contentType: 'text/html' });
  });
  await page.goto(url);
  await page.evaluate(() => {
    const video = document.querySelector('video');
    if (!video) return;
    const record = (name: string) => () => {
      (window as unknown as { __calls: unknown[] }).__calls.push({ name, at: Date.now() });
    };
    video.pause = record('pause');
    video.play = () => {
      record('play')();
      return Promise.resolve();
    };
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

function config(
  auto: boolean,
  pauseSeconds: number,
  holdOnHover = true,
  hover = false,
  active = true,
) {
  return { shorts: { auto, pauseSeconds, holdOnHover }, hover, active, videoOnly: false };
}

function calls(page: Page): Promise<Call[]> {
  return page.evaluate(() => (window as unknown as { __calls: Call[] }).__calls);
}

async function callNames(page: Page): Promise<string[]> {
  return (await calls(page)).map((call) => call.name);
}

function setTime(page: Page, currentTime: number, duration: number): Promise<void> {
  return page.evaluate(
    ([time, length]) => {
      const video = document.querySelector('video');
      if (!video) return;
      Object.defineProperty(video, 'currentTime', { value: time, configurable: true });
      Object.defineProperty(video, 'duration', { value: length, configurable: true });
      video.dispatchEvent(new Event('timeupdate'));
    },
    [currentTime, duration],
  );
}

async function loopJump(page: Page, duration = 10): Promise<void> {
  await setTime(page, duration - 0.2, duration);
  await setTime(page, 0.4, duration);
}

test('a loop jump pauses first and advances once after the pause', async ({ page }) => {
  await open(page, 'shorts.html');
  await sync(page, config(true, PAUSE_MS / 1000));
  await loopJump(page);
  await expect.poll(() => callNames(page)).toEqual(['pause']);
  await expect.poll(() => callNames(page)).toEqual(['pause', 'advance']);
  const [pause, advance] = (await calls(page)).map((call) => call.at);
  expect((advance ?? 0) - (pause ?? 0)).toBeGreaterThanOrEqual(PAUSE_MS - 50);
  await setTime(page, 0.5, 10);
  expect(await callNames(page)).toEqual(['pause', 'advance']);
});

test('during the loop seek the pause waits until the seek has ended', async ({ page }) => {
  await open(page, 'shorts.html');
  await sync(page, config(true, 5));
  await setTime(page, 9.8, 10);
  await page.evaluate(() => {
    const video = document.querySelector('video');
    if (video) Object.defineProperty(video, 'seeking', { value: true, configurable: true });
  });
  await setTime(page, 0.4, 10);
  expect(await callNames(page)).toEqual([]);
  await page.evaluate(() => document.querySelector('video')?.dispatchEvent(new Event('seeked')));
  await expect.poll(() => callNames(page)).toEqual(['pause']);
});

test('a seeked event does not pause once the machine has left the wait', async ({ page }) => {
  await open(page, 'shorts.html');
  await sync(page, config(true, 5));
  await setTime(page, 9.8, 10);
  await page.evaluate(() => {
    const video = document.querySelector('video');
    if (video) Object.defineProperty(video, 'seeking', { value: true, configurable: true });
  });
  await setTime(page, 0.4, 10);
  await sync(page, config(true, 5, true, true));
  await page.evaluate(() => document.querySelector('video')?.dispatchEvent(new Event('seeked')));
  // The seeked handler runs inside dispatchEvent, so a late pause would already be recorded.
  expect(await callNames(page)).toEqual(['play']);
});

test('becoming inactive during the pause sends nothing and cancels the advance', async ({
  page,
}) => {
  // A fake clock lets the pause run out without waiting for real time.
  await page.clock.install();
  await open(page, 'shorts.html');
  await sync(page, config(true, PAUSE_MS / 1000));
  await loopJump(page);
  expect(await callNames(page)).toEqual(['pause']);
  await sync(page, config(true, PAUSE_MS / 1000, true, false, false));
  await page.clock.runFor(PAUSE_MS + 200);
  await loopJump(page);
  await page.clock.runFor(PAUSE_MS + 200);
  expect(await callNames(page)).toEqual(['pause']);
});

test('the ended event also pauses and advances', async ({ page }) => {
  await open(page, 'shorts.html');
  await sync(page, config(true, PAUSE_MS / 1000));
  await page.evaluate(() => document.querySelector('video')?.dispatchEvent(new Event('ended')));
  await expect.poll(() => callNames(page)).toEqual(['pause', 'advance']);
});

test('with auto off a loop jump does nothing and the next run still advances once', async ({
  page,
}) => {
  await open(page, 'shorts.html');
  await sync(page, config(false, 0));
  await loopJump(page);
  expect(await callNames(page)).toEqual([]);
  await sync(page, config(true, 0));
  await loopJump(page);
  await expect.poll(() => callNames(page)).toEqual(['advance']);
});

test('hovering the video holds the advance at the end of a run', async ({ page }) => {
  await open(page, 'shorts.html');
  await sync(page, config(true, 0, true, true));
  await loopJump(page);
  expect(await callNames(page)).toEqual([]);
});

test('an ad in the same player advances only after its full run', async ({ page }) => {
  await open(page, 'shorts.html');
  await sync(page, config(true, PAUSE_MS / 1000));
  await setTime(page, 9.5, 10);
  await page.evaluate(() => document.querySelector('#ads-overlay')?.removeAttribute('hidden'));
  for (const time of [0.1, 3, 8, 14.6]) await setTime(page, time, 15);
  expect(await callNames(page)).toEqual([]);
  await setTime(page, 0.4, 15);
  await expect.poll(() => callNames(page)).toEqual(['pause']);
  await expect.poll(() => callNames(page)).toEqual(['pause', 'advance']);
});

test('a missing next control is reported after 2 s and the page stays usable', async ({ page }) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  await open(page, 'shorts-no-next.html');
  expect(await sync(page, config(true, 0))).toEqual({ aspect: 'portrait', problems: [] });
  await expect
    .poll(() => sync(page, config(true, 0)), { timeout: 8000 })
    .toEqual({ aspect: 'portrait', problems: ['controls-missing'] });
  expect(await page.title()).toBe('Short without next control');
  expect(errors).toEqual([]);
});

test('a problem verdict stays across a path change until the page has settled again', async ({
  page,
}) => {
  await open(page, 'shorts-no-next.html');
  await expect
    .poll(() => sync(page, config(true, 0)), { timeout: 8000 })
    .toEqual({ aspect: 'portrait', problems: ['controls-missing'] });
  await page.evaluate(() => history.pushState({}, '', '/shorts/short1'));
  expect(await sync(page, config(true, 0))).toEqual({
    aspect: 'portrait',
    problems: ['controls-missing'],
  });
});

test('a failed advance reports the problem at once until the next media start', async ({
  page,
}) => {
  await open(page, 'shorts-no-next.html');
  await sync(page, config(true, 0));
  await loopJump(page);
  expect((await sync(page, config(true, 0))).problems).toEqual(['controls-missing']);
  await page.evaluate(() => document.querySelector('video')?.dispatchEvent(new Event('loadstart')));
  expect((await sync(page, config(true, 0))).problems).toEqual([]);
});

test('a watch page is landscape and ignores a loop jump', async ({ page }) => {
  await open(page, 'shorts.html', 'https://www.youtube.com/watch?v=abc');
  expect(await sync(page, config(true, 0))).toEqual({ aspect: 'landscape', problems: [] });
  await loopJump(page);
  expect(await callNames(page)).toEqual([]);
});

test('a Shorts page is portrait with auto on or off and landscape after leaving', async ({
  page,
}) => {
  await open(page, 'shorts.html');
  expect((await sync(page, config(false, 1))).aspect).toBe('portrait');
  expect((await sync(page, config(true, 1))).aspect).toBe('portrait');
  await page.evaluate(() => history.pushState({}, '', '/watch?v=abc'));
  expect((await sync(page, config(true, 1))).aspect).toBe('landscape');
});

test('an iframe gets no bridge', async ({ page }) => {
  await open(page, 'with-frame.html');
  await expect(page.frameLocator('iframe').locator('#blank')).toBeAttached();
  const frame = page.frames().find((candidate) => candidate !== page.mainFrame());
  expect(await frame?.evaluate(() => '__floawty' in window)).toBe(false);
  expect(await page.evaluate(() => '__floawty' in window)).toBe(true);
});

test('another host gets a frozen no-op bridge that cannot be replaced', async ({ page }) => {
  await page.addInitScript({ path: SCRIPT });
  await page.route('https://accounts.google.com/**', (route) =>
    route.fulfill({ path: path.join(FIXTURES, 'blank.html'), contentType: 'text/html' }),
  );
  await page.goto('https://accounts.google.com/signin');
  const result = await page.evaluate(
    (input) => {
      const host = window as unknown as Record<string, { sync: (input: unknown) => unknown }>;
      const bridge = host['__floawty'];
      try {
        Object.defineProperty(window, '__floawty', { value: { sync: () => 'stolen' } });
      } catch {
        // The bridge must survive; the check below proves it.
      }
      return {
        answer: bridge?.sync(input),
        same: host['__floawty'] === bridge,
        frozen: Object.isFrozen(bridge),
      };
    },
    config(true, 1),
  );
  expect(result).toEqual({ answer: null, same: true, frozen: true });
});

test('the bridge cannot be replaced or removed by the page', async ({ page }) => {
  await open(page, 'shorts.html');
  const result = await page.evaluate(() => {
    const bridge = (window as unknown as Record<string, unknown>)['__floawty'];
    const attempt = (action: () => void) => {
      try {
        action();
      } catch {
        // Strict mode throws; the bridge must still be intact below.
      }
    };
    attempt(() => Object.defineProperty(window, '__floawty', { value: 1 }));
    attempt(() => delete (window as unknown as Record<string, unknown>)['__floawty']);
    return {
      same: (window as unknown as Record<string, unknown>)['__floawty'] === bridge,
      frozen: Object.isFrozen(bridge),
    };
  });
  expect(result).toEqual({ same: true, frozen: true });
});

test('garbage input returns a status and keeps the previous config', async ({ page }) => {
  await open(page, 'shorts.html');
  await sync(page, config(true, 0));
  const garbage = [
    null,
    'text',
    {},
    { shorts: { auto: 'yes', pauseSeconds: 0, holdOnHover: true }, hover: false },
    { shorts: { auto: false, pauseSeconds: -1, holdOnHover: true }, hover: false },
    { shorts: { auto: false, pauseSeconds: 0, holdOnHover: true } },
    { shorts: { auto: false, pauseSeconds: 0, holdOnHover: true }, hover: false },
  ];
  for (const input of garbage) {
    expect(await sync(page, input)).toEqual({ aspect: 'portrait', problems: [] });
  }
  await loopJump(page);
  await expect.poll(() => callNames(page)).toEqual(['advance']);
});
