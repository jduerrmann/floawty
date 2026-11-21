// Adapter tests: "video only" on TikTok – the feed list fills the window, TikTok pages itself.
import { expect, test, type Page } from '@playwright/test';
import {
  SETTLE_TIMEOUT,
  TIKTOK,
  open,
  input,
  sync,
  covers,
  rectOf,
  box,
  centre,
  viewport,
  scrollLocked,
  CORNERS,
} from './video-only-helpers';

const LIST = '#column-list-container';

function visible(page: Page, selector: string): Promise<boolean | undefined> {
  return page.evaluate((s) => document.querySelector(s)?.checkVisibility(), selector);
}

test.describe('TikTok', () => {
  test('video only lays the feed list over the page, each item fills the window', async ({
    page,
  }) => {
    await open(page, TIKTOK, 'foryou.html', '/foryou');
    expect(await sync(page, input(true))).toEqual({ aspect: 'portrait', problems: [] });
    const window = await viewport(page);
    expect(await rectOf(page, LIST)).toEqual(window);
    expect(await rectOf(page, '#one-column-item-0 section[data-e2e="feed-video"]')).toEqual(window);
    // The next item starts right below, so TikTok's snapping pages one window at a time.
    expect((await box(page, '#one-column-item-1')).y).toBe(window.height);
    expect(await covers(page, LIST, CORNERS)).toEqual([true, true, true, true]);
    expect(await scrollLocked(page)).toBe(true);
  });

  test('only the volume, the progress bar and TikTok labels stay on the video', async ({
    page,
  }) => {
    await open(page, TIKTOK, 'foryou.html', '/foryou');
    await sync(page, input(true));
    for (const id of ['#like', '#creator', '#description', '#music-info', '#more']) {
      expect(await visible(page, id), id).toBe(false);
    }
    for (const id of ['#volume', '#progress', '#tag', '#card-section', '#other-card']) {
      expect(await visible(page, id), id).toBe(true);
    }
  });

  test("TikTok's volume and progress bar sit at the bottom, clear of floawty's bar", async ({
    page,
  }) => {
    await open(page, TIKTOK, 'foryou.html', '/foryou');
    await sync(page, input(true));
    const { width, height } = await viewport(page);
    const progress = await box(page, '#progress');
    expect(progress.y + progress.height).toBeLessThanOrEqual(height);
    expect(progress.y).toBeGreaterThan(height - 24);
    expect([progress.x, progress.width]).toEqual([0, width]);
    const volume = await box(page, '#volume');
    expect(volume.y).toBeGreaterThanOrEqual(height / 2);
    expect(volume.y + volume.height).toBeLessThanOrEqual(progress.y);
    for (const id of ['#volume', '#progress']) {
      expect(await covers(page, id, [await centre(page, await box(page, id))]), id).toEqual([true]);
    }
  });

  test('videos and their posters keep their whole picture in the window', async ({ page }) => {
    await open(page, TIKTOK, 'foryou.html', '/foryou');
    await sync(page, input(true));
    for (const id of ['#first', '#poster']) {
      const fit = await page.evaluate((s) => {
        const element = document.querySelector(s);
        return element && getComputedStyle(element).objectFit;
      }, id);
      expect(fit, id).toBe('contain');
    }
  });

  test('a wheel over the video reaches the feed list, one item per window height', async ({
    page,
  }) => {
    await open(page, TIKTOK, 'foryou.html', '/foryou');
    await sync(page, input(true));
    const { width, height } = await viewport(page);
    await page.mouse.move(width / 2, height / 2);
    await page.mouse.wheel(0, height);
    await expect.poll(async () => (await box(page, '#one-column-item-1')).y).toBe(0);
  });

  test('a TikTok dialog stays above the feed list', async ({ page }) => {
    await open(page, TIKTOK, 'foryou.html', '/foryou');
    await sync(page, input(true));
    await page.evaluate(() => document.querySelector('#dialog')?.removeAttribute('hidden'));
    expect(await covers(page, '#dialog', [[0.5, 0.5]])).toEqual([true]);
  });

  // Paging on a video page changes the path to the next item's own video or photo page (live 2026-11-21).
  for (const pathname of [
    '/@creator/video/7710226394415959348',
    '/@creator/photo/7710226394415959348',
  ]) {
    test(`${pathname.split('/')[2]} pages are feed pages with video only`, async ({ page }) => {
      await open(page, TIKTOK, 'foryou.html', pathname);
      expect(await sync(page, input(true))).toEqual({ aspect: 'portrait', problems: [] });
      expect(await rectOf(page, LIST)).toEqual(await viewport(page));
    });
  }

  test('a profile page is no feed page', async ({ page }) => {
    await open(page, TIKTOK, 'foryou.html', '/@creator');
    expect(await sync(page, input(true))).toEqual({ aspect: 'landscape', problems: [] });
    expect(await scrollLocked(page)).toBe(false);
  });

  test('without video only the feed stays as it is', async ({ page }) => {
    await open(page, TIKTOK, 'foryou.html', '/foryou');
    expect(await sync(page, input(false))).toEqual({ aspect: 'portrait', problems: [] });
    expect(await covers(page, '#side-nav', [[0.02, 0.5]])).toEqual([true]);
    expect(await visible(page, '#like')).toBe(true);
    expect(await scrollLocked(page)).toBe(false);
  });

  test('without the feed list, video only leaves the page and reports the missing player', async ({
    page,
  }) => {
    await open(page, TIKTOK, 'foryou.html', '/foryou');
    await page.evaluate((s) => document.querySelector(s)?.removeAttribute('id'), LIST);
    await expect
      .poll(() => sync(page, input(true)), { timeout: SETTLE_TIMEOUT })
      .toEqual({ aspect: 'portrait', problems: ['player-missing'] });
    expect(await scrollLocked(page)).toBe(false);
  });

  test('the auto mode still moves on through the covered next control', async ({ page }) => {
    await open(page, TIKTOK, 'foryou.html', '/foryou');
    await sync(page, {
      ...input(true),
      shorts: { auto: true, pauseSeconds: 0, holdOnHover: true },
    });
    await page.evaluate(() =>
      (window as unknown as { __end: (id: string) => void }).__end('first'),
    );
    await expect
      .poll(() =>
        page.evaluate(() =>
          (window as unknown as { __calls: { name: string }[] }).__calls.map((c) => c.name),
        ),
      )
      .toContain('advance');
  });
});
