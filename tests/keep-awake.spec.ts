// Keeping services awake: a left service stays loaded out of sight and comes back at once.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { freshProfile, launch, type Profile, type RunningApp } from './app';

const IDS = ['a', 'b', 'c', 'd'];
// A stub video counts the pauses floawty sends when the page goes out of sight.
const PAGE =
  '<!doctype html><title>page</title><video id="v"></video>' +
  '<script>window.pauses = 0; document.getElementById("v").pause = () => window.pauses++;</script>';

interface Pages {
  url: (id: string) => string;
  requests: (id: string) => number;
  close: () => void;
}

async function servePages(): Promise<Pages> {
  const counts = new Map<string, number>();
  const server = createServer((request, response) => {
    const id = (request.url ?? '/').slice(1);
    if (IDS.includes(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
    response.end(PAGE);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: (id) => `http://127.0.0.1:${port}/${id}`,
    requests: (id) => counts.get(id) ?? 0,
    close: () => server.close(),
  };
}

function profileWith(pages: Pages, keepAwake: string): Profile {
  const profile = freshProfile();
  mkdirSync(profile.dataDir, { recursive: true });
  const customTiles = IDS.map((id) => ({ id, name: `Page ${id}`, url: pages.url(id) }));
  const settings = { noticeAccepted: true, customTiles, keepAwake };
  writeFileSync(path.join(profile.dataDir, 'settings.json'), JSON.stringify(settings));
  return profile;
}

const servicePage = (app: RunningApp, pages: Pages, id: string): Page | undefined =>
  app.pages().find((page) => page.url() === pages.url(id));

/** Clicks a tile and resolves with the milliseconds until its mark is gone again. */
async function open(app: RunningApp, id: string): Promise<number> {
  const name = `Page ${id}`;
  await app.home.locator('.tile', { hasText: name }).waitFor();
  return app.home.evaluate(async (name) => {
    const button = [...document.querySelectorAll<HTMLButtonElement>('.tile')].find(
      (tile) => tile.querySelector('.tile-name')?.textContent === name,
    );
    const start = performance.now();
    button?.click();
    while (button?.hasAttribute('aria-busy')) await new Promise(requestAnimationFrame);
    return performance.now() - start;
  }, name);
}

async function openAndWait(app: RunningApp, pages: Pages, id: string): Promise<Page> {
  await open(app, id);
  await expect.poll(() => Boolean(servicePage(app, pages, id)), { timeout: 10_000 }).toBe(true);
  const page = servicePage(app, pages, id) as Page;
  await page.waitForFunction(() => document.readyState === 'complete');
  return page;
}

const leave = (app: RunningApp) =>
  app.home.evaluate(() => window.__TAURI_INTERNALS__.invoke('close_service'));

async function expectLoaded(app: RunningApp, pages: Pages, id: string, loaded: boolean) {
  await expect.poll(() => Boolean(servicePage(app, pages, id)), { timeout: 10_000 }).toBe(loaded);
}

function logOf(profile: Profile): string {
  const file = path.join(profile.dataDir, 'logs', 'floawty.log');
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
}

test('with keeping awake off, a service left for the tiles closes', async () => {
  const pages = await servePages();
  const app = await launch(profileWith(pages, 'off'));
  try {
    await openAndWait(app, pages, 'a');
    await leave(app);
    await expectLoaded(app, pages, 'a', false);
  } finally {
    await app.stop();
    pages.close();
  }
});

// Whether WebView2 throttles it shows in the measurement: over CDP a hidden page stays "visible".
test('the last service stays loaded, quiet and out of sight, and its tile brings it back at once', async () => {
  const pages = await servePages();
  const app = await launch(profileWith(pages, 'last'));
  try {
    const page = await openAndWait(app, pages, 'a');
    await page.evaluate(() => Object.assign(window, { marker: 42 }));
    await leave(app);
    await expect.poll(() => page.evaluate(() => (window as { pauses?: number }).pauses)).toBe(1);
    const ms = await open(app, 'a');
    console.log(`back to the awake service in ${Math.round(ms)} ms`);
    expect(ms).toBeLessThan(300);
    expect(pages.requests('a')).toBe(1);
    expect(await page.evaluate(() => (window as { marker?: number }).marker)).toBe(42);
    expect(await page.evaluate(() => innerWidth)).toBeGreaterThan(0);
  } finally {
    await app.stop();
    pages.close();
  }
});

test('with the last service kept, opening another one closes it', async () => {
  const pages = await servePages();
  const app = await launch(profileWith(pages, 'last'));
  try {
    await openAndWait(app, pages, 'a');
    await leave(app);
    await openAndWait(app, pages, 'b');
    await expectLoaded(app, pages, 'a', false);
  } finally {
    await app.stop();
    pages.close();
  }
});

test('up to three keeps the three most recently used', async () => {
  const pages = await servePages();
  const app = await launch(profileWith(pages, 'three'));
  try {
    for (const id of ['a', 'b', 'c']) {
      await openAndWait(app, pages, id);
      await leave(app);
    }
    await openAndWait(app, pages, 'd');
    await expectLoaded(app, pages, 'a', false);
    for (const id of ['b', 'c', 'd']) expect(servicePage(app, pages, id)).toBeDefined();
  } finally {
    await app.stop();
    pages.close();
  }
});

test('switching keeping awake off, or removing the tile, closes the awake service', async () => {
  const pages = await servePages();
  const app = await launch(profileWith(pages, 'three'));
  try {
    for (const id of ['a', 'b']) {
      await openAndWait(app, pages, id);
      await leave(app);
    }
    await app.home.evaluate(
      (tiles) => window.__TAURI_INTERNALS__.invoke('set_custom_tiles', { tiles }),
      [{ id: 'b', name: 'Page b', url: pages.url('b') }],
    );
    await expectLoaded(app, pages, 'a', false);
    await app.home.evaluate(() =>
      window.__TAURI_INTERNALS__.invoke('set_keep_awake', { keep: 'off' }),
    );
    await expectLoaded(app, pages, 'b', false);
  } finally {
    await app.stop();
    pages.close();
  }
});

test('an awake service out of sight never opens the browser', async () => {
  const pages = await servePages();
  const profile = profileWith(pages, 'last');
  const app = await launch(profile);
  try {
    const page = await openAndWait(app, pages, 'a');
    await leave(app);
    await page.evaluate(() => (location.href = 'https://example.org/'));
    await expect
      .poll(() => logOf(profile))
      .toContain('kept a hidden service from leaving: example.org');
    expect(logOf(profile)).not.toContain('opened outside floawty');
  } finally {
    await app.stop();
    pages.close();
  }
});

test('a page that starts playing after it was left is paused again', async () => {
  const pages = await servePages();
  const app = await launch(profileWith(pages, 'last'));
  try {
    const page = await openAndWait(app, pages, 'a');
    await leave(app);
    await expect.poll(() => page.evaluate(() => (window as { pauses?: number }).pauses)).toBe(1);
    await page.evaluate(() => {
      const video = document.getElementById('v') as HTMLVideoElement;
      setTimeout(() => void video.play().catch(() => undefined), 300);
    });
    await expect.poll(() => page.evaluate(() => (window as { pauses?: number }).pauses)).toBe(2);
  } finally {
    await app.stop();
    pages.close();
  }
});

test('the segments in the settings choose how many services stay awake', async () => {
  const pages = await servePages();
  const app = await launch(profileWith(pages, 'off'));
  try {
    const keepAwake = () =>
      app.home.evaluate(async () => {
        const state = (await window.__TAURI_INTERNALS__.invoke('overlay_state')) as {
          keepAwake: string;
        };
        return state.keepAwake;
      });
    const radio = (value: string) => app.home.locator(`#keep-awake input[value="${value}"]`);
    await expect(radio('off')).toBeChecked();
    await radio('three').evaluate((input: HTMLInputElement) => input.click());
    await expect.poll(keepAwake).toBe('three');
    await expect(radio('three')).toBeChecked();
  } finally {
    await app.stop();
    pages.close();
  }
});
