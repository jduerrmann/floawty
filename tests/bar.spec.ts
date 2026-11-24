// The bar over a service: hover, back to the tiles, opacity and the click-through dot.
import { expect, test, type Page } from '@playwright/test';
import { freshProfile, launch, type RunningApp } from './app';
import {
  clickAt,
  dragBy,
  ownedPopups,
  pointAt,
  pointAway,
  pressKeys,
  resizeWindow,
  windowPosition,
} from './desktop';

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
  pointAt(app.pid, 0.5, 0.6);
  pointAt(app.pid, 0.52, 0.62);
  await expect.poll(() => barShown(app.bar)).toBe('true');
}

test('over a service the bar shows while the cursor is on floawty', async () => {
  const app = await launch(freshProfile());
  try {
    pointAway(app.pid);
    await openExample(app);
    await expect.poll(() => barShown(app.bar)).toBe('false');
    await hoverVideo(app);
    pointAway(app.pid);
    await expect.poll(() => barShown(app.bar)).toBe('false');
  } finally {
    pointAway(app.pid);
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
    pointAway(app.pid);
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
    pointAway(app.pid);
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
    pointAway(app.pid);
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
    pointAway(app.pid);
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
    clickAt(app.pid, 0.35, 0.34);
    pressKeys('a');
    await expect.poll(() => ownedPopups(app.pid)).toBe(1);
    // The resting cursor hides the bar after 3 s; the list must survive that.
    await expect.poll(() => barShown(app.bar), { timeout: 6000 }).toBe('false');
    expect(ownedPopups(app.pid)).toBe(1);
  } finally {
    pointAway(app.pid);
    await app.stop();
  }
});

test('the grip in the bar moves the window over a service', async () => {
  const app = await launch(freshProfile());
  try {
    await openExample(app);
    await hoverVideo(app);
    const windowWidth = await app.home.evaluate(() => innerWidth);
    const windowHeight = await app.home.evaluate(() => innerHeight);
    const barWidth = await app.bar.evaluate(() => innerWidth);
    const grip = await app.bar.evaluate(() => {
      const rect = document.getElementById('grip')?.getBoundingClientRect();
      return rect ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } : null;
    });
    if (!grip) throw new Error('the grip is missing');
    const offset = Math.floor((windowWidth - barWidth) / 2);
    pointAt(app.pid, (offset + grip.x) / windowWidth, grip.y / windowHeight);
    const before = windowPosition(app.pid);
    const after = dragBy(app.pid, -120, -90);
    expect(before.x - after.x).toBeGreaterThan(100);
    expect(before.y - after.y).toBeGreaterThan(70);
  } finally {
    pointAway(app.pid);
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
    // Without the cursor on it the bar is hidden and lays itself out late, so the whole layout is
    // polled; the bar's own width tells a late page from a stale width in the shell.
    // The smallest overlay a user can drag: 240 px inside, plus the 2 × 8 px invisible border.
    resizeWindow(app.pid, 256, 151);
    await expect.poll(() => app.home.evaluate(() => innerWidth)).toBe(240);
    await app.bar.evaluate(() => window.__TAURI_INTERNALS__.invoke('set_opacity', { value: 0.8 }));
    await expect.poll(layout).toEqual({ bar: 240, fits: true, button: 20, slider: 24 });
    resizeWindow(app.pid, 800, 450);
    await expect.poll(() => app.home.evaluate(() => innerWidth)).toBeGreaterThan(600);
    // 88 px alone would also pass in the compact layout, so the buttons must be full size too.
    await expect.poll(layout).toEqual({ bar: 400, fits: true, button: 28, slider: 88 });
  } finally {
    await app.stop();
  }
});
