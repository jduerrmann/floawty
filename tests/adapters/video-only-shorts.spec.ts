// Adapter tests: "video only" on YouTube Shorts – the list fills the window, YouTube's own controls stay.
import { expect, test } from '@playwright/test';
import {
  SETTLE_TIMEOUT,
  YOUTUBE,
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

test.describe('YouTube Shorts', () => {
  test('video only lays the Shorts list over the page, one Short fills the window', async ({
    page,
  }) => {
    await open(page, YOUTUBE, 'shorts.html', '/shorts/short0');
    expect(await sync(page, input(true))).toEqual({ aspect: 'portrait', problems: [] });
    expect(await rectOf(page, '#shorts-container')).toEqual(await viewport(page));
    expect(await rectOf(page, '#shorts-player')).toEqual(await viewport(page));
    // Near the bottom edge lie YouTube's own controls, over the video as on YouTube.
    expect(await covers(page, '#shorts-player', CORNERS.slice(0, 3))).toEqual([true, true, true]);
    expect(await scrollLocked(page)).toBe(true);
    // YouTube's buttons set their own visibility and take clicks; they must not be drawn at all.
    expect(
      await page.evaluate(() => document.querySelector('#self-visible')?.checkVisibility()),
    ).toBe(false);
  });

  test("YouTube's control row and seek bar sit at the bottom, clear of floawty's bar", async ({
    page,
  }) => {
    await open(page, YOUTUBE, 'shorts.html', '/shorts/short0');
    await sync(page, input(true));
    const { width, height } = await viewport(page);
    const bar = await box(page, '#scrubber yt-progress-bar');
    expect(bar.y + bar.height).toBeLessThanOrEqual(height);
    expect(bar.y + bar.height).toBeGreaterThan(height - 8);
    expect([bar.x, bar.width]).toEqual([0, width]);
    expect(await covers(page, '#scrubber', [await centre(page, bar)])).toEqual([true]);
    const row = await box(page, '.player-controls');
    expect([row.x, row.width]).toEqual([0, width]);
    // The row sits right on the bar's hit area, so the buttons stay clear of it.
    expect(Math.abs(row.y + row.height - bar.y)).toBeLessThanOrEqual(2);
    for (const id of ['#yt-play', '#yt-mute', '#yt-more']) {
      const button = await box(page, id);
      expect(button.y).toBeGreaterThanOrEqual(height / 2);
      expect(await covers(page, id, [await centre(page, button)])).toEqual([true]);
    }
  });

  test('a Short the player has left keeps its row and seek bar hidden', async ({ page }) => {
    await open(page, YOUTUBE, 'shorts.html', '/shorts/short0');
    await sync(page, input(true));
    for (const id of ['#left-play', '#left-bar', '#beside-player-text', '#beside-wrapper-text']) {
      expect(await page.evaluate((s) => document.querySelector(s)?.checkVisibility(), id)).toBe(
        false,
      );
    }
  });

  test('on an ad Short the ad card stays visible over the video', async ({ page }) => {
    await open(page, YOUTUBE, 'shorts.html', '/shorts/short0');
    await page.evaluate(() => document.querySelector('#ads-overlay')?.removeAttribute('hidden'));
    await sync(page, input(true));
    // The card's text, not its box: a skipped content still leaves the box visible.
    expect(await page.evaluate(() => document.querySelector('#ad-card')?.checkVisibility())).toBe(
      true,
    );
    // YouTube's row and seek bar now share the bottom; the card stays on top and takes clicks.
    const card = await box(page, '#ads-overlay');
    const { height } = await viewport(page);
    const low: [number, number] = [0.1, (card.y + card.height - 4) / height];
    expect(await covers(page, '#ads-overlay', [await centre(page, card), low])).toEqual([
      true,
      true,
    ]);
  });

  test('a renamed level on the way to the player never hides the video', async ({ page }) => {
    await open(page, YOUTUBE, 'shorts.html', '/shorts/short0');
    await page.evaluate(() => document.querySelector('#player-container')?.removeAttribute('id'));
    await sync(page, input(true));
    expect(
      await page.evaluate(() => document.querySelector('#shorts-player')?.checkVisibility()),
    ).toBe(true);
  });

  test('a wheel over the video reaches the Shorts list, one box per window height', async ({
    page,
  }) => {
    await open(page, YOUTUBE, 'shorts.html', '/shorts/short0');
    await sync(page, input(true));
    const { width, height } = await viewport(page);
    await page.mouse.move(width / 2, height / 2);
    // Headless Edge sends wheel turns like a touchpad; a turn of one window height reaches the next box.
    await page.mouse.wheel(0, height);
    await expect
      .poll(() => page.evaluate(() => document.querySelector('#shorts-container')?.scrollTop))
      .toBe(height);
  });

  test('a YouTube dialog stays above the Shorts list', async ({ page }) => {
    await open(page, YOUTUBE, 'shorts.html', '/shorts/short0');
    await sync(page, input(true));
    await page.evaluate(() => document.querySelector('#dialog')?.removeAttribute('hidden'));
    expect(await covers(page, '#dialog', [[0.5, 0.5]])).toEqual([true]);
  });

  test('without video only the Shorts page stays as it is', async ({ page }) => {
    await open(page, YOUTUBE, 'shorts.html', '/shorts/short0');
    expect(await sync(page, input(false))).toEqual({ aspect: 'portrait', problems: [] });
    expect(await covers(page, '#masthead-container', [[0.5, 0.02]])).toEqual([true]);
    expect(await scrollLocked(page)).toBe(false);
  });

  test('renamed Short boxes leave the page as it is and report the missing player', async ({
    page,
  }) => {
    await open(page, YOUTUBE, 'shorts.html', '/shorts/short0');
    await page.evaluate(() => {
      for (const box of document.querySelectorAll('.reel')) box.className = 'reel';
    });
    await expect
      .poll(() => sync(page, input(true)), { timeout: SETTLE_TIMEOUT })
      .toEqual({ aspect: 'portrait', problems: ['player-missing'] });
    expect(await scrollLocked(page)).toBe(false);
  });

  test('without the Shorts list, video only reports the missing player', async ({ page }) => {
    await open(page, YOUTUBE, 'shorts.html', '/shorts/short0');
    await page.evaluate(() => document.querySelector('#shorts-container')?.removeAttribute('id'));
    await expect
      .poll(() => sync(page, input(true)), { timeout: SETTLE_TIMEOUT })
      .toEqual({ aspect: 'portrait', problems: ['player-missing'] });
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
