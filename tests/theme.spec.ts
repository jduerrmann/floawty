// floawty's own light or dark: pages, title bar, restart, and services left alone.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { freshProfile, launch, type RunningApp } from './app';
import { sendSettingChange, titleBarIsDark } from './title-bar';

const scheme = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
const windowsDark = async (page: Page) => {
  // Playwright emulates light on every page it connects to over CDP.
  await page.emulateMedia({ colorScheme: null });
  return page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches);
};

const addSymbolIsLight = (page: Page) =>
  page.evaluate(() => {
    const symbol = document.querySelector('.tile-add .tile-symbol') as Element;
    const context = new OffscreenCanvas(1, 1).getContext('2d');
    if (!context) throw new Error('no canvas');
    context.fillStyle = getComputedStyle(symbol).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    return (context.getImageData(0, 0, 1, 1).data[0] ?? 0) > 128;
  });

// Before the page's own scripts run, so only the startup script can have set it.
async function themeAtFirstPaint(page: Page): Promise<string | null> {
  await page.evaluate(() => sessionStorage.removeItem('theme'));
  await page.addInitScript(() => {
    document.addEventListener('readystatechange', () => {
      if (document.readyState !== 'interactive') return;
      (window as unknown as { early: string | null }).early =
        document.documentElement.getAttribute('data-theme');
    });
  });
  await page.reload();
  return page.evaluate(() => (window as unknown as { early: string | null }).early);
}

async function choose(app: RunningApp, theme: 'system' | 'light' | 'dark'): Promise<void> {
  await app.home.locator(`#theme input[value="${theme}"]`).check();
}

test('light and dark apply at once to pages and title bar, and system follows Windows', async () => {
  const app = await launch(freshProfile());
  try {
    const dark = await windowsDark(app.home);
    await app.bar.evaluate(() => window.__TAURI_INTERNALS__.invoke('toggle_mode'));
    await app.bar.locator('#settings').click();
    await expect(app.home.locator('#theme input[value="system"]')).toBeChecked();
    await app.home.locator('#language').focus();
    await app.home.locator('#language').press('Tab');
    await expect(app.home.locator('#theme input[value="system"]')).toBeFocused();
    await app.home.keyboard.press('ArrowRight');
    await expect.poll(() => scheme(app.home)).toBe('light');
    for (const theme of ['light', 'dark', 'light'] as const) {
      await choose(app, theme);
      await expect.poll(() => scheme(app.home)).toBe(theme);
      await expect.poll(() => scheme(app.bar)).toBe(theme);
      // "+" is drawn in the text colour: dark on light glass, light on dark.
      await expect.poll(() => addSymbolIsLight(app.home)).toBe(theme === 'dark');
      await expect.poll(() => titleBarIsDark(app.pid)).toBe(theme === 'dark');
      // tao resets the title bar on this message.
      sendSettingChange(app.pid);
      await expect.poll(() => titleBarIsDark(app.pid)).toBe(theme === 'dark');
    }
    await choose(app, 'system');
    await expect.poll(() => scheme(app.home)).toBe('light dark');
    await expect.poll(() => titleBarIsDark(app.pid)).toBe(dark);
  } finally {
    await app.stop();
  }
});

test('the choice survives a language change and a restart, and leaves services to Windows', async () => {
  const profile = freshProfile();
  const first = await launch(profile);
  let dark: boolean;
  let chosen: 'light' | 'dark';
  try {
    dark = await windowsDark(first.home);
    chosen = dark ? 'light' : 'dark';
    await first.bar.locator('#settings').click();
    await choose(first, chosen);
    await first.home.locator('#language').selectOption('de');
    await expect(first.home.locator('#settings-title')).toHaveText('Einstellungen');
    expect(await scheme(first.home)).toBe(chosen);
  } finally {
    await first.stop();
  }
  const saved = readFileSync(path.join(profile.dataDir, 'settings.json'), 'utf8');
  expect(saved).toContain(`"theme": "${chosen}"`);

  const second = await launch(profile);
  try {
    expect(await scheme(second.home)).toBe(chosen);
    expect(await scheme(second.bar)).toBe(chosen);
    expect(await themeAtFirstPaint(second.home)).toBe(chosen);
    await second.bar.evaluate(() =>
      window.__TAURI_INTERNALS__.invoke('open_service', {
        service: { id: 'example', url: 'https://example.com/', allowedDomains: ['example.com'] },
      }),
    );
    const service = () => second.pages().find((page) => page.url().startsWith('https://example'));
    await expect.poll(() => Boolean(service())).toBe(true);
    expect(await windowsDark(service() as Page)).toBe(dark);
    for (const theme of ['system', 'light', 'dark']) {
      await second.bar.evaluate(async (theme) => {
        const { invoke } = window.__TAURI_INTERNALS__;
        const { language, shorts, updateCheck, animations, fullscreenInWindow } = (await invoke(
          'overlay_state',
        )) as Record<string, unknown>;
        await invoke('set_preferences', {
          preferences: { language, shorts, updateCheck, animations, fullscreenInWindow, theme },
        });
      }, theme);
      await expect
        .poll(() => second.bar.evaluate(() => document.documentElement.dataset.theme))
        .toBe(theme);
      await expect
        .poll(() => second.bar.evaluate(() => getComputedStyle(document.body).colorScheme))
        .toBe('dark');
    }
  } finally {
    await second.stop();
  }
});
