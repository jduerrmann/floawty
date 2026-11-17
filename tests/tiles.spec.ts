// The home page: service tiles, the first-start notice and own pages as tiles.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { freshProfile, launch } from './app';

const SERVICE_NAMES = ['YouTube', 'Twitch', 'Netflix', 'Prime Video', 'Disney+', 'RTL+'];

test('shows one tile per service and a tile to add a page', async () => {
  const app = await launch(freshProfile());
  try {
    const tiles = app.home.locator('#tiles > li');
    await expect(tiles).toHaveCount(SERVICE_NAMES.length + 1);
    for (const name of SERVICE_NAMES) {
      await expect(
        app.home.locator('#tiles').getByRole('button', { name, exact: true }),
      ).toBeVisible();
    }
  } finally {
    await app.stop();
  }
});

test('the WebView2 notice is shown once', async () => {
  const profile = freshProfile();
  const first = await launch(profile);
  try {
    await expect(first.home.locator('#notice')).toBeVisible();
    await first.home.locator('#notice-ok').click();
    await expect(first.home.locator('#notice')).toBeHidden();
  } finally {
    await first.stop();
  }
  const second = await launch(profile);
  try {
    await expect(second.home.locator('#tiles > li').first()).toBeVisible();
    await expect(second.home.locator('#notice')).toBeHidden();
  } finally {
    await second.stop();
  }
});

test('an own page becomes a tile, survives a restart and can be removed', async () => {
  const profile = freshProfile();
  const first = await launch(profile);
  const home = first.home;
  try {
    await home.locator('.tile-add').click();
    await home.locator('#tile-name').fill('My page');
    await home.locator('#tile-url').fill('not a url');
    await home.locator('#tile-save').click();
    await expect(home.locator('#tile-error')).not.toBeEmpty();
    await home.locator('#tile-url').fill('example.com');
    await home.locator('#tile-save').click();
    await expect(home.getByRole('button', { name: 'My page', exact: true })).toBeVisible();
  } finally {
    await first.stop();
  }
  const saved = readFileSync(path.join(profile.dataDir, 'settings.json'), 'utf8');
  expect(saved).toContain('https://example.com/');

  const second = await launch(profile);
  try {
    const tile = second.home.locator('li.custom');
    await expect(tile).toHaveCount(1);
    await tile.locator('.tile-more').click();
    await tile.locator('.tile-menu button').last().click();
    await expect(second.home.locator('li.custom')).toHaveCount(0);
  } finally {
    await second.stop();
  }
});

test('a tile opens its page over the home page and it reopens on start', async () => {
  const profile = freshProfile();
  const first = await launch(profile);
  try {
    await first.home.locator('.tile-add').click();
    await first.home.locator('#tile-name').fill('Example');
    await first.home.locator('#tile-url').fill('https://example.com/');
    await first.home.locator('#tile-save').click();
    await first.home.getByRole('button', { name: 'Example', exact: true }).click();
    await expect
      .poll(() => first.pages().some((p) => p.url().startsWith('https://example.com')))
      .toBe(true);
  } finally {
    await first.stop();
  }
  const second = await launch(profile);
  try {
    await expect
      .poll(() => second.pages().some((p) => p.url().startsWith('https://example.com')))
      .toBe(true);
  } finally {
    await second.stop();
  }
});

test('window commands keep working while a service is open', async () => {
  const app = await launch(freshProfile());
  try {
    await app.home.evaluate(() =>
      window.__TAURI_INTERNALS__.invoke('open_service', {
        service: { id: 'example', url: 'https://example.com/', allowedDomains: ['example.com'] },
      }),
    );
    await expect
      .poll(() => app.pages().some((p) => p.url().startsWith('https://example.com')))
      .toBe(true);
    for (let switches = 0; switches < 2; switches += 1) {
      await app.home.evaluate(() => window.__TAURI_INTERNALS__.invoke('toggle_mode'));
    }
    await expect(app.home.locator('#about')).toContainText('floawty');
  } finally {
    await app.stop();
  }
});
