// The click shows the opening: the tile marks it at once, the page takes over when it starts.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { expect, test, type Page } from '@playwright/test';
import { freshProfile, launch, type RunningApp } from './app';

const ANSWER_AFTER_MS = 1500;
const TILE = 'Slow page';
// The first script of the page names the width it sees, before any resize could reach it.
const HEAD_SEES_WIDTH =
  '<!doctype html><script>document.title = String(innerWidth)</script><p>here</p>';

interface SlowPage {
  url: string;
  requests: () => number;
  close: () => void;
}

/** A local page that answers late, or drops the connection when `fail` is set. */
async function slowPage(fail = false): Promise<SlowPage> {
  let count = 0;
  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    if (request.url !== '/') return response.end();
    count += 1;
    setTimeout(() => {
      if (fail) request.socket.destroy();
      else response.end(HEAD_SEES_WIDTH);
    }, ANSWER_AFTER_MS);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}/`, requests: () => count, close: () => server.close() };
}

async function launchWithTile(url: string, reopen = false): Promise<RunningApp> {
  const profile = freshProfile();
  mkdirSync(profile.dataDir, { recursive: true });
  const lastService = reopen ? { id: 'slow', url, allowedDomains: ['127.0.0.1'] } : null;
  const customTiles = [{ id: 'slow', name: TILE, url }];
  const settings = { noticeAccepted: true, customTiles, lastService };
  writeFileSync(path.join(profile.dataDir, 'settings.json'), JSON.stringify(settings));
  return launch(profile);
}

// Clicks in the page: the mark must stand before the click's task ends, so the next frame shows it.
async function clickAndLookForMark(home: Page): Promise<boolean> {
  await home.locator('.tile', { hasText: TILE }).waitFor();
  return home.evaluate((name) => {
    const button = [...document.querySelectorAll<HTMLButtonElement>('.tile')].find(
      (tile) => tile.querySelector('.tile-name')?.textContent === name,
    );
    button?.click();
    return button?.getAttribute('aria-busy') === 'true';
  }, TILE);
}

const busyTiles = (home: Page) => home.locator('.tile[aria-busy="true"]');

test('a tile shows at once that its page opens, and a second click starts nothing', async () => {
  const page = await slowPage();
  const app = await launchWithTile(page.url);
  try {
    expect(await clickAndLookForMark(app.home)).toBe(true);
    await expect(app.home.locator('#tiles')).toHaveAttribute('data-opening', '');
    await app.home.locator('.tile', { hasText: TILE }).click({ force: true });
    await delay(300);
    expect(page.requests()).toBe(1);
    await expect(busyTiles(app.home)).toHaveCount(0, { timeout: 10_000 });
    const service = app.pages().find((other) => other.url() === page.url);
    expect(service).toBeDefined();
    expect(await service?.evaluate(() => innerWidth)).toBeGreaterThan(0);
    expect(Number(await service?.title())).toBeGreaterThan(0);
    expect(page.requests()).toBe(1);
  } finally {
    await app.stop();
    page.close();
  }
});

test('a page that never answers still ends the opening', async () => {
  const page = await slowPage(true);
  const app = await launchWithTile(page.url);
  try {
    expect(await clickAndLookForMark(app.home)).toBe(true);
    await expect(busyTiles(app.home)).toHaveCount(1);
    await expect(busyTiles(app.home)).toHaveCount(0, { timeout: 15_000 });
  } finally {
    await app.stop();
    page.close();
  }
});

test('reopening the last service at start shows its tile opening too', async () => {
  const page = await slowPage();
  const app = await launchWithTile(page.url, true);
  try {
    await expect(busyTiles(app.home)).toHaveCount(1);
    await expect(busyTiles(app.home)).toHaveCount(0, { timeout: 10_000 });
    expect(page.requests()).toBe(1);
  } finally {
    await app.stop();
    page.close();
  }
});

test('back in the bar cancels an opening', async () => {
  const page = await slowPage();
  const app = await launchWithTile(page.url);
  try {
    expect(await clickAndLookForMark(app.home)).toBe(true);
    const back = app.bar.locator('#back');
    await expect(back).toBeVisible();
    await back.click();
    await expect(busyTiles(app.home)).toHaveCount(0);
    await delay(ANSWER_AFTER_MS + 500);
    expect(app.pages().some((other) => other.url() === page.url)).toBe(false);
    await expect(back).toBeHidden();
  } finally {
    await app.stop();
    page.close();
  }
});
