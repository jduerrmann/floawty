// A page's fullscreen: inside floawty's window by default, the whole screen when switched off.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { freshProfile, launch, type Profile, type RunningApp } from './app';

const FIXTURE = path.join(import.meta.dirname, '..', 'test', 'fixtures', 'fullscreen.html');
// Written only when the window went fullscreen against the switch.
const UNDONE = 'window went fullscreen against the switch';

async function openFixture(app: RunningApp, host: string): Promise<Page> {
  await app.bar.evaluate(
    (domain) =>
      window.__TAURI_INTERNALS__.invoke('open_service', {
        service: { id: 'example', url: `https://${domain}/`, allowedDomains: [domain] },
      }),
    host,
  );
  return loadFixture(app, host);
}

// Also for the service floawty reopens at start.
async function loadFixture(app: RunningApp, host: string): Promise<Page> {
  let service: Page | undefined;
  await expect
    .poll(() => (service = app.pages().find((page) => page.url().includes(host))))
    .toBeTruthy();
  const page = service as Page;
  await page.route(`https://${host}/**`, (route) =>
    route.fulfill({ path: FIXTURE, contentType: 'text/html' }),
  );
  await page.goto(`https://${host}/player`);
  return page;
}

const width = (page: Page) => page.evaluate(() => window.innerWidth);
const screenWidth = (page: Page) => page.evaluate(() => screen.width);
const fullscreenId = (page: Page) => page.evaluate(() => document.fullscreenElement?.id ?? null);
const playerWidth = (page: Page) =>
  page.evaluate(() => document.getElementById('player')?.getBoundingClientRect().width);
const log = (profile: Profile) =>
  readFileSync(path.join(profile.dataDir, 'logs', 'floawty.log'), 'utf8');
const floaty = (profile: Profile) =>
  JSON.parse(readFileSync(path.join(profile.dataDir, 'settings.json'), 'utf8')).floaty;

const mode = (app: RunningApp) =>
  app.bar.evaluate(async () => {
    const state = await window.__TAURI_INTERNALS__.invoke('overlay_state');
    return (state as { mode: string }).mode;
  });

async function enter(page: Page): Promise<void> {
  await page.click('#fullscreen');
  await expect.poll(() => fullscreenId(page)).toBe('player');
}

async function leave(page: Page): Promise<void> {
  await page.evaluate(() => document.exitFullscreen());
  await expect.poll(() => fullscreenId(page)).toBe(null);
}

function setFullscreenInWindow(app: RunningApp, on: boolean): Promise<void> {
  return app.bar.evaluate(async (fullscreenInWindow) => {
    const { invoke } = window.__TAURI_INTERNALS__;
    const { language, theme, animations, shorts, updateCheck } = (await invoke(
      'overlay_state',
    )) as Record<string, unknown>;
    await invoke('set_preferences', {
      preferences: { language, theme, animations, shorts, updateCheck, fullscreenInWindow },
    });
  }, on);
}

test('page fullscreen fills only the window, in the floaty view and window mode', async () => {
  const profile = freshProfile();
  const app = await launch(profile);
  try {
    // The handler is taken over for every service webview, not only the first.
    await openFixture(app, 'example.com');
    for (const mode of ['floaty', 'window']) {
      if (mode === 'window') {
        await app.bar.evaluate(() => window.__TAURI_INTERNALS__.invoke('toggle_mode'));
      }
      const page = await openFixture(app, 'example.org');
      const before = await width(page);
      await enter(page);
      await expect.poll(() => playerWidth(page)).toBe(before);
      // Long enough for a window fullscreen to land and be reported.
      await page.waitForTimeout(500);
      expect(await width(page)).toBe(before);
      await leave(page);
      expect(await width(page)).toBe(before);
    }
  } finally {
    await app.stop();
  }
  // The start reopens the last service on another path.
  const again = await launch(profile);
  try {
    const page = await loadFixture(again, 'example.org');
    const before = await width(page);
    await enter(page);
    await page.waitForTimeout(500);
    expect(await width(page)).toBe(before);
    await leave(page);
  } finally {
    await again.stop();
  }
  expect(log(profile)).not.toContain(UNDONE);
});

test('switched off, page fullscreen takes the screen and gives it back', async () => {
  const profile = freshProfile();
  const app = await launch(profile);
  try {
    await app.bar.locator('#settings').click();
    const box = app.home.getByRole('switch', {
      name: /^(Page fullscreen stays in the window|Vollbild der Seiten bleibt im Fenster)$/,
    });
    await expect(box).toBeChecked();
    await box.uncheck();
    await app.home.locator('#settings-done').click();
    const page = await openFixture(app, 'example.com');
    const before = await width(page);
    const screen = await screenWidth(page);
    const ratio = await page.evaluate(() => devicePixelRatio);
    const geometry = floaty(profile);
    await enter(page);
    await expect.poll(() => width(page)).toBe(screen);
    // A mode switch now would store the screen as a geometry, so it waits.
    await app.bar.evaluate(() => window.__TAURI_INTERNALS__.invoke('toggle_mode'));
    // Past the settle time: the screen-sized window must not be saved.
    await page.waitForTimeout(500);
    expect(await mode(app)).toBe('floaty');
    expect(floaty(profile)).toEqual(geometry);
    await leave(page);
    await expect.poll(() => width(page)).toBe(before);
    await expect.poll(() => floaty(profile)?.width).toBe(Math.round(before * ratio));

    await enter(page);
    await expect.poll(() => width(page)).toBe(screen);
    await setFullscreenInWindow(app, true);
    await expect.poll(() => width(page)).toBe(before);
    expect(await fullscreenId(page)).toBe('player');
    await setFullscreenInWindow(app, false);
    await expect.poll(() => width(page)).toBe(screen);
    await app.bar.evaluate(() => window.__TAURI_INTERNALS__.invoke('close_service'));
    await expect.poll(() => width(app.home)).toBe(before);
  } finally {
    await app.stop();
  }
  expect(readFileSync(path.join(profile.dataDir, 'settings.json'), 'utf8')).toContain(
    '"fullscreenInWindow": false',
  );
});
