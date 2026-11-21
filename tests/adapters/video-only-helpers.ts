// Shared helpers of the video-only adapter tests: open a fixture with a page script, sync, measure.
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';

export const ROOT = path.join(import.meta.dirname, '..', '..');
export const SETTLE_TIMEOUT = 8000;

export interface Status {
  aspect: 'portrait' | 'landscape';
  problems: string[];
}

export interface Site {
  script: string;
  origin: string;
  fixtures: string;
}

export const YOUTUBE: Site = {
  script: 'youtube',
  origin: 'https://www.youtube.com',
  fixtures: 'youtube',
};
export const TWITCH: Site = {
  script: 'twitch',
  origin: 'https://www.twitch.tv',
  fixtures: 'twitch',
};
export const CRUNCHYROLL: Site = {
  script: 'crunchyroll',
  origin: 'https://www.crunchyroll.com',
  fixtures: 'crunchyroll',
};
export const TIKTOK: Site = {
  script: 'tiktok',
  origin: 'https://www.tiktok.com',
  fixtures: 'tiktok',
};
export const EPISODE = '/de/watch/G0000000/episode';

export async function open(
  page: Page,
  site: Site,
  fixture: string,
  pathname: string,
): Promise<void> {
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

export function input(videoOnly: boolean) {
  return {
    shorts: { auto: false, pauseSeconds: 1, holdOnHover: true },
    hover: false,
    active: true,
    videoOnly,
  };
}

export function sync(page: Page, value: unknown): Promise<Status> {
  return page.evaluate(
    (inputValue) =>
      (window as unknown as { __floawty: { sync: (input: unknown) => Status } }).__floawty.sync(
        inputValue,
      ),
    value,
  );
}

/** Whether the topmost element at each point (fractions of the viewport) lies in `selector`. */
export function covers(
  page: Page,
  selector: string,
  points: [number, number][],
): Promise<boolean[]> {
  return page.evaluate(
    ([inside, list]) =>
      list.map(
        ([x, y]) =>
          document.elementFromPoint(x * innerWidth, y * innerHeight)?.closest(inside) != null,
      ),
    [selector, points] as const,
  );
}

export function rectOf(page: Page, selector: string) {
  return page.evaluate((s) => {
    const rect = document.querySelector(s)?.getBoundingClientRect();
    return rect && { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }, selector);
}

export async function box(page: Page, selector: string) {
  const rect = await rectOf(page, selector);
  if (!rect) throw new Error(`${selector} is missing`);
  return rect;
}

/** The centre of a box as fractions of the viewport, for `covers`. */
export async function centre(
  page: Page,
  rect: { x: number; y: number; width: number; height: number },
): Promise<[number, number]> {
  const { width, height } = await viewport(page);
  return [(rect.x + rect.width / 2) / width, (rect.y + rect.height / 2) / height];
}

export function viewport(page: Page) {
  return page.evaluate(() => ({ x: 0, y: 0, width: innerWidth, height: innerHeight }));
}

/** Whether the user can scroll the page; scripts could still scroll it either way. */
export function scrollLocked(page: Page): Promise<boolean> {
  return page.evaluate(() => getComputedStyle(document.documentElement).overflowY === 'hidden');
}

export const CORNERS: [number, number][] = [
  [0.02, 0.02],
  [0.5, 0.05],
  [0.98, 0.5],
  [0.5, 0.95],
];
