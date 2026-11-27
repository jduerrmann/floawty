// The bar over a service: hover, back to the tiles, opacity and the click-through dot.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { freshProfile, launch, type Profile, type RunningApp } from './app';
import { moveWindow, ownedPopups, resizeWindow, windowPosition } from './desktop';
import { dragBy, pointAt } from './real-input';

const EXAMPLE = {
  service: { id: 'example', url: 'https://example.com/', allowedDomains: ['example.com'] },
};

async function openExample(app: RunningApp): Promise<void> {
  await app.home.evaluate(
    (args) => window.__TAURI_INTERNALS__.invoke('open_service', args),
    EXAMPLE,
  );
  await expect
    .poll(() => app.pages().some((page) => page.url().startsWith('https://example.com')))
    .toBe(true);
}

const barShown = (bar: Page) => bar.evaluate(() => document.body.dataset.visible);

async function hoverVideo(app: RunningApp): Promise<void> {
  await app.point(0.5, 0.6);
  await app.point(0.52, 0.62);
  await expect.poll(() => barShown(app.bar)).toBe('true');
}

test('over a service the bar shows while the cursor is on floawty', async () => {
  const app = await launch(freshProfile());
  try {
    await app.pointAway();
    await openExample(app);
    await expect.poll(() => barShown(app.bar)).toBe('false');
    await hoverVideo(app);
    await app.pointAway();
    await expect.poll(() => barShown(app.bar)).toBe('false');
  } finally {
    await app.stop();
  }
});

test('◀ in the bar closes the service and shows the tiles with the bar', async () => {
  const app = await launch(freshProfile());
  try {
    await openExample(app);
    await hoverVideo(app);
    await app.bar.locator('#back').click();
    await expect
      .poll(() => app.pages().some((page) => page.url().startsWith('https://example.com')))
      .toBe(false);
    await expect(app.bar.locator('#back')).toBeHidden();
    await expect.poll(() => barShown(app.bar)).toBe('true');
  } finally {
    await app.stop();
  }
});

test('the opacity slider sets the opacity', async () => {
  const app = await launch(freshProfile());
  try {
    await app.bar.locator('#opacity').fill('50');
    await expect
      .poll(() => app.home.evaluate(() => window.__TAURI_INTERNALS__.invoke('overlay_state')))
      .toMatchObject({ opacity: 0.5 });
  } finally {
    await app.stop();
  }
});

test('click-through shows the dot over a service with its hotkey', async () => {
  const app = await launch(freshProfile());
  try {
    await openExample(app);
    await hoverVideo(app);
    await app.bar.locator('#click-through').click();
    await expect(app.bar.locator('#click-through-dot')).toBeVisible();
    await expect(app.bar.locator('#controls')).toBeHidden();
    await expect(app.bar.locator('#click-through-hint')).toHaveText(
      /(Ctrl|Strg)\+Alt\+(Shift|Umschalt)\+D/,
    );
    await app.home.evaluate(() => window.__TAURI_INTERNALS__.invoke('toggle_click_through'));
    await expect(app.bar.locator('#click-through-dot')).toBeHidden();
  } finally {
    await app.stop();
  }
});

// The scheme is emulated light, so only the pin can make the bar dark.
test('the bar is dark over a service, and follows Windows on the tiles and in the settings', async () => {
  const app = await launch(freshProfile());
  const scheme = () => app.bar.evaluate(() => getComputedStyle(document.body).colorScheme);
  const pillColor = () =>
    app.bar.locator('#controls').evaluate((pill) => getComputedStyle(pill).color);
  try {
    await app.bar.emulateMedia({ colorScheme: 'light' });
    await expect.poll(scheme).not.toBe('dark');
    const lightText = await pillColor();
    await openExample(app);
    await expect.poll(scheme).toBe('dark');
    expect(await pillColor()).not.toBe(lightText);
    await app.bar.evaluate(() =>
      window.__TAURI_INTERNALS__.invoke('set_settings_open', { open: true }),
    );
    await expect.poll(scheme).not.toBe('dark');
    expect(await pillColor()).toBe(lightText);
  } finally {
    await app.stop();
  }
});

test('the bar leaves the page clickable: narrow over a service, above it in window mode', async () => {
  const app = await launch(freshProfile());
  try {
    await openExample(app);
    const service = app.pages().find((page) => page.url().startsWith('https://example.com'));
    if (!service) throw new Error('the service page is missing');
    const width = (page: Page) => page.evaluate(() => innerWidth);
    const height = (page: Page) => page.evaluate(() => innerHeight);
    const windowWidth = await width(app.home);
    await expect.poll(() => width(app.bar)).toBeLessThan(windowWidth - 100);
    expect(await app.bar.evaluate(() => document.getElementById('controls')?.scrollWidth)).toBe(
      await app.bar.evaluate(() => document.getElementById('controls')?.clientWidth),
    );
    expect(await height(service)).toBe(await height(app.home));

    await app.bar.evaluate(() => window.__TAURI_INTERNALS__.invoke('toggle_mode'));
    await expect.poll(() => barShown(app.bar)).toBe('true');
    await expect(app.bar.locator('body')).toHaveClass(/docked/);
    await expect.poll(async () => (await width(app.bar)) === (await width(app.home))).toBe(true);
    await expect.poll(async () => (await height(app.home)) - (await height(service))).toBe(40);
  } finally {
    await app.stop();
  }
});

test("a page's suggestion list stays open when the bar hides", async () => {
  const app = await launch(freshProfile());
  try {
    await openExample(app);
    const service = app.pages().find((page) => page.url().startsWith('https://example.com'));
    if (!service) throw new Error('the service page is missing');
    await service.setContent(
      '<input id="mail" list="mails" style="margin: 80px 20px; width: 300px">' +
        '<datalist id="mails"><option value="a@example.com"><option value="b@example.com"></datalist>',
    );
    await app.click(0.35, 0.34);
    await service.keyboard.press('a');
    await expect.poll(() => ownedPopups(app.pid)).toBe(1);
    // The resting cursor hides the bar after 3 s; the list must survive that.
    await expect.poll(() => barShown(app.bar), { timeout: 6000 }).toBe('false');
    expect(ownedPopups(app.pid)).toBe(1);
  } finally {
    await app.stop();
  }
});

/** The grip's centre in the bar page, and where that is as a fraction of floawty's window. */
async function gripOf(app: RunningApp) {
  const windowWidth = await app.home.evaluate(() => innerWidth);
  const windowHeight = await app.home.evaluate(() => innerHeight);
  const barWidth = await app.bar.evaluate(() => innerWidth);
  const grip = await app.bar.evaluate(() => {
    const rect = document.getElementById('grip')?.getBoundingClientRect();
    return rect ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } : null;
  });
  if (!grip) throw new Error('the grip is missing');
  const offset = Math.floor((windowWidth - barWidth) / 2);
  return { ...grip, fx: (offset + grip.x) / windowWidth, fy: grip.y / windowHeight };
}

test('the grip in the bar moves the window over a service', { tag: '@real' }, async () => {
  const app = await launch(freshProfile());
  try {
    await openExample(app);
    await hoverVideo(app);
    const grip = await gripOf(app);
    pointAt(app.pid, grip.fx, grip.fy);
    const before = windowPosition(app.pid);
    const after = dragBy(app.pid, -120, -90);
    expect(before.x - after.x).toBeGreaterThan(100);
    expect(before.y - after.y).toBeGreaterThan(70);
  } finally {
    await app.pointAway();
    await app.stop();
  }
});

/** The floaty rectangle floawty saved, or none before it saved one. */
function savedFloaty(profile: Profile): { x: number; y: number } | null {
  try {
    const saved = JSON.parse(readFileSync(path.join(profile.dataDir, 'settings.json'), 'utf8'));
    return saved.floaty ?? null;
  } catch {
    return null;
  }
}

const apart = (a: { x: number; y: number } | null, b: { x: number; y: number }) =>
  a ? Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) : Infinity;

// The launcher's shim swallows the request for Windows' move loop, so a plain window move stands
// in for the drag; the real drag is the @real test above.
test('the grip asks for a window move, and floawty settles the window once the button is up', async () => {
  test.skip(
    process.env.FLOAWTY_TEST_HIDDEN !== '1',
    'needs the hidden launcher for the drag count',
  );
  const profile = freshProfile();
  const app = await launch(profile);
  try {
    await openExample(app);
    await hoverVideo(app);
    const grip = await gripOf(app);
    await app.point(grip.fx, grip.fy);
    expect((await app.counts())?.drag).toBe(0);
    await app.press(app.bar, grip.x, grip.y);
    await expect.poll(async () => (await app.counts())?.drag).toBe(1);

    // A move close to the work area's top left corner: the snap would pull it into the corner.
    const corner = await app.home.evaluate(() => {
      const { availLeft, availTop } = screen as unknown as { availLeft: number; availTop: number };
      return {
        x: Math.round(availLeft * devicePixelRatio),
        y: Math.round(availTop * devicePixelRatio),
      };
    });
    moveWindow(app.pid, corner.x, corner.y + 10);
    const moved = windowPosition(app.pid);
    expect(moved).toEqual({ x: corner.x, y: corner.y + 10 });
    // Several settle ticks (250 ms each) pass; with the button down none may settle the window.
    await app.home.waitForTimeout(1200);
    expect(windowPosition(app.pid)).toEqual(moved);
    expect(apart(savedFloaty(profile), corner)).toBeGreaterThan(1);

    await app.release();
    await expect.poll(() => apart(savedFloaty(profile), corner)).toBeLessThanOrEqual(1);
    expect(windowPosition(app.pid)).not.toEqual(moved);
  } finally {
    await app.release();
    await app.pointAway();
    await app.stop();
  }
});

test('the service follows the window size and fills it again in the floaty view', async () => {
  const app = await launch(freshProfile());
  try {
    await openExample(app);
    const service = app.pages().find((page) => page.url().startsWith('https://example.com'));
    if (!service) throw new Error('the service page is missing');
    const size = (page: Page) => page.evaluate(() => `${innerWidth}x${innerHeight}`);
    resizeWindow(app.pid, 800, 450);
    await expect.poll(() => app.home.evaluate(() => innerWidth)).toBeGreaterThan(600);
    await expect.poll(async () => (await size(service)) === (await size(app.home))).toBe(true);
    await app.bar.evaluate(() => window.__TAURI_INTERNALS__.invoke('toggle_mode'));
    await app.bar.evaluate(() => window.__TAURI_INTERNALS__.invoke('toggle_mode'));
    await expect.poll(async () => (await size(service)) === (await size(app.home))).toBe(true);
  } finally {
    await app.stop();
  }
});

test('the bar fits all nine controls at the minimum width and grows back when wider', async () => {
  const app = await launch(freshProfile());
  try {
    // YouTube's id offers ▶ and ▣ too, ⤢ is always there; the page stays on example.com.
    await app.home.evaluate(() =>
      window.__TAURI_INTERNALS__.invoke('open_service', {
        service: { id: 'youtube', url: 'https://example.com/', allowedDomains: ['example.com'] },
      }),
    );
    await expect(app.bar.locator('#video-only')).toBeVisible();
    const layout = () =>
      app.bar.evaluate(() => {
        const controls = document.getElementById('controls') as HTMLElement;
        const width = (id: string) => document.getElementById(id)?.getBoundingClientRect().width;
        return {
          bar: innerWidth,
          fits: controls.scrollWidth <= controls.clientWidth,
          button: width('quit'),
          slider: width('opacity'),
        };
      });
    // A hidden bar's page can keep an old size until it shows (WebView2), so the layout is checked
    // as the user sees it; the bar's own width tells a late page from a stale width in the shell.
    // A shown bar lays itself out within a few ms, well before the 3 s idle hide.
    const shown = { timeout: 1000 };
    // The smallest overlay a user can drag: 240 px inside, plus the 2 × 8 px invisible border.
    resizeWindow(app.pid, 256, 151);
    await expect.poll(() => app.home.evaluate(() => innerWidth)).toBe(240);
    await app.bar.evaluate(() => window.__TAURI_INTERNALS__.invoke('set_opacity', { value: 0.8 }));
    await hoverVideo(app);
    await expect.poll(layout, shown).toEqual({ bar: 240, fits: true, button: 20, slider: 24 });
    resizeWindow(app.pid, 800, 450);
    await expect.poll(() => app.home.evaluate(() => innerWidth)).toBeGreaterThan(600);
    await hoverVideo(app);
    // 88 px alone would also pass in the compact layout, so the buttons must be full size too.
    await expect.poll(layout, shown).toEqual({ bar: 400, fits: true, button: 28, slider: 88 });
  } finally {
    await app.stop();
  }
});
