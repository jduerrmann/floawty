// The play/pause hotkey's script (src-tauri/src/play_pause.js) on fixture pages.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const ROOT = path.join(import.meta.dirname, '..', '..');
const SCRIPT = readFileSync(path.join(ROOT, 'src-tauri', 'src', 'play_pause.js'), 'utf8');
const FIXTURES = path.join(ROOT, 'test', 'fixtures');

// play() and pause() only switch a flag, since the fixture media have no source.
async function open(page: Page, url: string, fixture: string): Promise<void> {
  await page.route(url, (route) =>
    route.fulfill({ path: path.join(FIXTURES, fixture), contentType: 'text/html' }),
  );
  await page.goto(url);
  await page.evaluate(() => {
    for (const video of document.querySelectorAll<HTMLMediaElement>('video, audio')) {
      const flag = video as HTMLMediaElement & { __playing?: boolean };
      flag.__playing ??= false;
      // The TikTok fixture already reads paused from its own flag.
      if (!Object.hasOwn(video, 'paused')) {
        Object.defineProperty(video, 'paused', { get: () => !flag.__playing });
      }
      video.pause = () => void (flag.__playing = false);
      video.play = () => {
        flag.__playing = true;
        return Promise.resolve();
      };
    }
  });
}

function press(page: Page): Promise<unknown> {
  return page.evaluate(SCRIPT);
}

function playing(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLMediaElement>('video, audio')]
      .filter((video) => !video.paused)
      .map((v) => v.id),
  );
}

test('on TikTok it pauses the playing video, then plays the item in view, never a neighbour', async ({
  page,
}) => {
  await open(page, 'https://www.tiktok.com/foryou', 'tiktok/foryou.html');
  await page.evaluate(() => (window as unknown as { __show: (i: number) => void }).__show(1));
  expect(await playing(page)).toEqual(['second']);
  await press(page);
  expect(await playing(page)).toEqual([]);
  await press(page);
  expect(await playing(page)).toEqual(['second']);
});

test('on a TikTok photo series it pauses the music and never starts a video', async ({ page }) => {
  await open(page, 'https://www.tiktok.com/foryou', 'tiktok/foryou.html');
  await page.evaluate(() => (window as unknown as { __show: (i: number) => void }).__show(2));
  expect(await playing(page)).toEqual(['music']);
  await press(page);
  expect(await playing(page)).toEqual([]);
  await press(page);
  expect(await playing(page)).toEqual([]);
});

test('a page with one video plays it even when it is out of view', async ({ page }) => {
  await open(page, 'https://www.example.com/watch', 'one-video.html');
  await press(page);
  expect(await playing(page)).toEqual(['only']);
  await press(page);
  expect(await playing(page)).toEqual([]);
});
