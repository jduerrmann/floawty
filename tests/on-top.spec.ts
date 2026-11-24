// Always on top as a switch: 🖈 and its hotkey, the stored choice, click-through, window mode
// and the show/hide hotkey with another window in front or floawty minimized.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { freshProfile, launch, type RunningApp } from './app';
import { minimize, windowFlags } from './desktop';
import { clickAt, openOtherWindow, OTHER_TITLE, pressKeys } from './real-input';

const flags = (app: RunningApp) => () => windowFlags(app.pid);
const invoke = (app: RunningApp, command: string, args: Record<string, unknown> = {}) =>
  app.bar.evaluate(([name, values]) => window.__TAURI_INTERNALS__.invoke(name, values), [
    command,
    args,
  ] as const);

async function switchOff(app: RunningApp): Promise<void> {
  await invoke(app, 'toggle_always_on_top');
  await expect.poll(flags(app)).toMatchObject({ topmost: false });
}

test('🖈 and its hotkey switch always on top, and a restart keeps the choice', async () => {
  const profile = freshProfile();
  let app = await launch(profile);
  try {
    const pin = app.bar.locator('#on-top');
    await expect.poll(flags(app)).toMatchObject({ visible: true, topmost: true });
    await expect(pin).toHaveAttribute('aria-pressed', 'true');
    await invoke(app, 'set_opacity', { value: 0.5 });
    await expect.poll(flags(app)).toMatchObject({ alpha: 128 });
    await pin.click();
    // Changing the window style must not lose the opacity.
    await expect.poll(flags(app)).toMatchObject({ topmost: false, alpha: 128 });
    await expect(pin).toHaveAttribute('aria-pressed', 'false');
  } finally {
    await app.stop();
  }
  const saved = JSON.parse(readFileSync(path.join(profile.dataDir, 'settings.json'), 'utf8'));
  expect(saved.alwaysOnTop).toBe(false);
  app = await launch(profile);
  try {
    await expect.poll(flags(app)).toMatchObject({ visible: true, topmost: false });
    await expect(app.bar.locator('#on-top')).toHaveAttribute('aria-pressed', 'false');
    await app.hotkey('Ctrl+Alt+Shift+T');
    await expect.poll(flags(app)).toMatchObject({ topmost: true });
    await expect(app.bar.locator('#on-top')).toHaveAttribute('aria-pressed', 'true');
  } finally {
    await app.stop();
  }
});

test('click-through keeps floawty on top while it is on', async () => {
  const app = await launch(freshProfile());
  try {
    await switchOff(app);
    await invoke(app, 'toggle_click_through');
    await expect.poll(flags(app)).toMatchObject({ topmost: true });
    await invoke(app, 'toggle_click_through');
    await expect.poll(flags(app)).toMatchObject({ topmost: false });
  } finally {
    await app.stop();
  }
});

test('window mode is never on top and ignores the switch', async () => {
  const app = await launch(freshProfile());
  try {
    await invoke(app, 'toggle_mode');
    await expect.poll(flags(app)).toMatchObject({ topmost: false });
    await expect(app.bar.locator('#on-top')).toBeDisabled();
    // Hotkeys run in order, so once the mode is back the first one has been handled.
    await app.hotkey('Ctrl+Alt+Shift+T');
    await app.hotkey('Ctrl+Alt+Shift+F');
    await expect.poll(flags(app)).toMatchObject({ topmost: true });
    expect(
      await app.home.evaluate(() => window.__TAURI_INTERNALS__.invoke('overlay_state')),
    ).toMatchObject({ mode: 'floaty', alwaysOnTop: true });
  } finally {
    await app.stop();
  }
});

test(
  'show/hide brings a floaty view that is not on top to the front before hiding it',
  { tag: '@real' },
  async () => {
    // About twenty PowerShell calls and a cold WinForms start.
    test.slow();
    const app = await launch(freshProfile());
    const other = openOtherWindow();
    const otherPid = other.pid ?? 0;
    try {
      await expect
        .poll(() => windowFlags(otherPid, OTHER_TITLE).visible, { timeout: 15000 })
        .toBe(true);
      clickAt(otherPid, 0.5, 0.5);
      await expect.poll(() => windowFlags(otherPid, OTHER_TITLE).foreground).toBe(true);
      pressKeys('^%+o');
      await expect.poll(flags(app)).toMatchObject({ visible: false });
      pressKeys('^%+o');
      await expect.poll(flags(app)).toMatchObject({ visible: true });

      await switchOff(app);
      clickAt(otherPid, 0.5, 0.5);
      await expect.poll(() => windowFlags(otherPid, OTHER_TITLE).foreground).toBe(true);
      pressKeys('^%+o');
      await expect.poll(flags(app)).toMatchObject({ visible: true, foreground: true });
      pressKeys('^%+o');
      await expect.poll(flags(app)).toMatchObject({ visible: false });

      pressKeys('^%+o');
      await expect.poll(flags(app)).toMatchObject({ visible: true });
      await invoke(app, 'set_opacity', { value: 0.5 });
      minimize(app.pid);
      await expect.poll(flags(app)).toMatchObject({ minimized: true });
      pressKeys('^%+o');
      await expect
        .poll(flags(app))
        .toMatchObject({ minimized: false, foreground: true, alpha: 128 });
    } finally {
      other.kill();
      await app.stop();
    }
  },
);
