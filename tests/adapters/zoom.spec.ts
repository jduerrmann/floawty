// Adapter tests: the zoom script fills the width of a wide overlay, cutting only top and bottom.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const ROOT = path.join(import.meta.dirname, '..', '..');
const ORIGIN = 'https://zoom.example';
const WIDE = { width: 960, height: 400 }; // 12:5
const NORMAL = { width: 960, height: 540 }; // 16:9

async function open(page: Page, query: string, viewport = WIDE, ready = true): Promise<void> {
  const script = path.join(ROOT, 'dist', 'page', '_zoom.js');
  if (!existsSync(script)) throw new Error(`${script} is missing: run npm run build:ui`);
  await page.setViewportSize(viewport);
  await page.addInitScript({ path: script });
  await page.route(`${ORIGIN}/**`, (route) =>
    route.fulfill({
      path: path.join(ROOT, 'test', 'fixtures', 'zoom', 'player.html'),
      contentType: 'text/html',
    }),
  );
  await page.goto(`${ORIGIN}/watch?${query}`);
  if (ready)
    await page.waitForFunction(
      () => (document.querySelector('#player video') as HTMLVideoElement).videoWidth > 0,
    );
}

function zoom(page: Page, on: boolean): Promise<void> {
  return page.evaluate(
    (value) => (window as unknown as { __floawtyZoom: (on: boolean) => void }).__floawtyZoom(value),
    on,
  );
}

/** Waits until the script has had its frame, instead of a fixed sleep. */
function frames(page: Page): Promise<void> {
  return page.evaluate(
    () =>
      new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
  );
}

/** The visible picture's box: the element's box with the transform, letterboxed by its ratio. */
function picture(page: Page) {
  return page.evaluate(() => {
    const video = document.querySelector('#player video') as HTMLVideoElement;
    const box = video.getBoundingClientRect();
    const ratio = video.videoWidth / video.videoHeight;
    const width = Math.min(box.width, box.height * ratio);
    const height = Math.min(box.height, box.width / ratio);
    return { width: Math.round(width), height: Math.round(height) };
  });
}

const transform = (page: Page, selector = '#player video') =>
  page.evaluate((s) => getComputedStyle(document.querySelector(s) as Element).transform, selector);

async function untouched(page: Page): Promise<void> {
  await frames(page);
  await frames(page);
  expect(await transform(page)).toBe('none');
}

for (const layout of ['contain', 'sized']) {
  test(`a 16:9 picture fills the width of a 12:5 overlay (${layout})`, async ({ page }) => {
    await open(page, `w=320&h=180&layout=${layout}`);
    await zoom(page, true);
    await expect.poll(() => picture(page).then((p) => p.width)).toBe(WIDE.width);
    expect((await picture(page)).height).toBeGreaterThanOrEqual(WIDE.height);
  });
}

test('zoom switched on before the stream starts takes effect when it starts', async ({ page }) => {
  await open(page, 'w=320&h=180&late', WIDE, false);
  await zoom(page, true);
  await expect.poll(() => picture(page).then((p) => p.width)).toBe(WIDE.width);
});

test('a picture that changes its shape is measured again', async ({ page }) => {
  await open(page, 'w=384&h=160');
  await zoom(page, true);
  await untouched(page);
  await page.evaluate(() =>
    (window as unknown as { __reshape: (w: number, h: number) => void }).__reshape(320, 180),
  );
  await expect.poll(() => picture(page).then((p) => p.width)).toBe(WIDE.width);
});

test('the largest video is zoomed, not a preview earlier in the page', async ({ page }) => {
  await open(page, 'w=320&h=180&preview');
  await zoom(page, true);
  await expect.poll(() => transform(page)).not.toBe('none');
  expect(await transform(page, '#preview')).toBe('none');
});

test('a replaced main video gets the zoom, the old one lets go of it', async ({ page }) => {
  await open(page, 'w=320&h=180');
  await zoom(page, true);
  await expect.poll(() => transform(page)).not.toBe('none');
  await page.evaluate(() => (window as unknown as { __swap: () => void }).__swap());
  await expect.poll(() => picture(page).then((p) => p.width)).toBe(WIDE.width);
  expect(await page.locator('video[data-floawty-zoom]').count()).toBe(1);
});

test('a video the page makes small without a window resize loses the zoom', async ({ page }) => {
  await open(page, 'w=320&h=180&layout=sized');
  await zoom(page, true);
  await expect.poll(() => transform(page)).not.toBe('none');
  await page.evaluate(() => (window as unknown as { __shrink: () => void }).__shrink());
  await expect.poll(() => transform(page)).toBe('none');
});

test('a 12:5 picture in a 12:5 overlay is left alone', async ({ page }) => {
  await open(page, 'w=384&h=160');
  await zoom(page, true);
  await untouched(page);
});

test('a 12:5 picture in a 16:9 overlay keeps its bars and is never cut at the sides', async ({
  page,
}) => {
  await open(page, 'w=384&h=160&layout=sized', NORMAL);
  await zoom(page, true);
  await untouched(page);
});

test('a 16:9 overlay never zooms, so a 4:3 picture keeps its height', async ({ page }) => {
  await open(page, 'w=320&h=240', NORMAL);
  await zoom(page, true);
  await untouched(page);
});

test('no zoom where it would be beyond 1.5 (a 4:3 picture in a 12:5 overlay)', async ({ page }) => {
  await open(page, 'w=320&h=240');
  await zoom(page, true);
  await untouched(page);
});

test('a small preview video is never zoomed', async ({ page }) => {
  await open(page, 'w=320&h=180&layout=small');
  await zoom(page, true);
  await untouched(page);
});

test('a video the page already crops with object-fit cover is left alone', async ({ page }) => {
  await open(page, 'w=320&h=180&layout=cover');
  await zoom(page, true);
  await untouched(page);
});

test('a video off the centre of the view is never zoomed (it would lose a side)', async ({
  page,
}) => {
  await open(page, 'w=320&h=180&layout=left');
  await zoom(page, true);
  await untouched(page);
});

test('switching off, or no word from floawty, leaves the picture as the page made it', async ({
  page,
}) => {
  await open(page, 'w=320&h=180');
  await untouched(page);
  await zoom(page, true);
  await expect.poll(() => transform(page)).not.toBe('none');
  await zoom(page, false);
  await expect.poll(() => transform(page)).toBe('none');
});

test('widening the overlay while zoom is on zooms without another word', async ({ page }) => {
  await open(page, 'w=320&h=180', NORMAL);
  await zoom(page, true);
  await page.setViewportSize(WIDE);
  await expect.poll(() => picture(page).then((p) => p.width)).toBe(WIDE.width);
});

test('the page cannot replace the switch', async ({ page }) => {
  await open(page, 'w=320&h=180');
  const replaced = await page.evaluate(() => {
    const host = window as unknown as { __floawtyZoom: unknown };
    const before = host.__floawtyZoom;
    try {
      host.__floawtyZoom = () => undefined;
    } catch {
      // Strict mode throws; either way the original must stay.
    }
    return host.__floawtyZoom !== before;
  });
  expect(replaced).toBe(false);
});
