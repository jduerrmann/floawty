// The bar over a service: hover, back to the tiles, opacity and the click-through dot.
import { expect, test, type Page } from '@playwright/test';
import { freshProfile, launch, type RunningApp } from './app';
import { pointAt, pointAway } from './desktop';

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
