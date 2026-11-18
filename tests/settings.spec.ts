// The settings panel: language, hotkeys, Shorts and "Reset all data".
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { freshProfile, launch, type Profile, type RunningApp } from './app';

const settingsFile = (profile: Profile) => path.join(profile.dataDir, 'settings.json');

async function openSettings(app: RunningApp): Promise<void> {
  await app.bar.locator('#settings').click();
  await expect(app.home.locator('#settings-panel')).toBeVisible();
  await expect(app.home.locator('#home')).toBeHidden();
}

test('the language changes both pages and is kept', async () => {
  const profile = freshProfile();
  const app = await launch(profile);
  try {
    await openSettings(app);
    await app.home.locator('#language').selectOption('de');
    await expect(app.home.locator('#settings-title')).toHaveText('Einstellungen');
    await expect(app.bar.locator('#settings')).toHaveAttribute('aria-label', 'Einstellungen');
    await app.home.locator('#language').selectOption('en');
    await expect(app.home.locator('#settings-title')).toHaveText('Settings');
    await expect(app.bar.locator('#quit')).toHaveAttribute('aria-label', 'Close floawty');
    await app.home.locator('#language').press('Escape');
    await expect(app.home.locator('#settings-panel')).toBeHidden();
    await expect(app.home.locator('#home')).toBeVisible();
  } finally {
    await app.stop();
  }
  expect(readFileSync(settingsFile(profile), 'utf8')).toContain('"language": "en"');
});

test('the Shorts hover hold and portrait size are saved', async () => {
  const profile = freshProfile();
  const app = await launch(profile);
  try {
    await openSettings(app);
    await expect(app.home.locator('#shorts-hold')).toBeChecked();
    await expect(app.home.locator('#portrait-size')).toHaveValue('rotated');
    await app.home.locator('#shorts-hold').uncheck();
    await app.home.locator('#portrait-size').selectOption('separate');
    await expect(app.home.locator('#portrait-size')).toHaveValue('separate');
  } finally {
    await app.stop();
  }
  const saved = JSON.parse(readFileSync(settingsFile(profile), 'utf8')) as {
    shorts: { holdOnHover: boolean; portraitSize: string };
  };
  expect(saved.shorts).toMatchObject({ holdOnHover: false, portraitSize: 'separate' });
});

test('a new hotkey is recorded, a conflict is shown and it survives a restart', async () => {
  const profile = freshProfile();
  const first = await launch(profile);
  try {
    await openSettings(first);
    const clickThrough = first.home.locator('button[data-action="clickThrough"]');
    await clickThrough.click();
    await clickThrough.press('Control+Alt+Shift+O');
    await expect(first.home.locator('#hotkey-error')).not.toBeEmpty();
    await clickThrough.press('Control+Alt+Shift+K');
    await expect(clickThrough).toHaveText(/^(Ctrl|Strg)\+Alt\+(Shift|Umschalt)\+K$/);
    await expect(first.home.locator('#hotkey-error')).toBeEmpty();
  } finally {
    await first.stop();
  }
  expect(readFileSync(settingsFile(profile), 'utf8')).toContain(
    '"clickThrough": "Ctrl+Alt+Shift+K"',
  );
  const second = await launch(profile);
  try {
    await openSettings(second);
    await expect(second.home.locator('button[data-action="clickThrough"]')).toHaveText(/\+K$/);
  } finally {
    await second.stop();
  }
});

function childrenOf(pid: number): number[] {
  const query = `(Get-CimInstance Win32_Process -Filter "ParentProcessId=${pid} AND Name='floawty.exe'").ProcessId`;
  const output = execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', query]);
  return output.toString().split(/\s+/).filter(Boolean).map(Number);
}

test('reset all data deletes settings and sign-ins and restarts floawty', async () => {
  const profile = freshProfile();
  const app = await launch(profile);
  const signIn = path.join(profile.webviewDir, 'sign-in-stand-in.txt');
  let restarted: number[] = [];
  try {
    await app.home.locator('#notice-ok').click();
    await expect
      .poll(() => readFileSync(settingsFile(profile), 'utf8'))
      .toContain('"noticeAccepted": true');
    mkdirSync(profile.webviewDir, { recursive: true });
    writeFileSync(signIn, 'cookie');
    await openSettings(app);
    await app.home.locator('#reset').click();
    await app.home.locator('#reset-yes').click();
    await expect.poll(() => childrenOf(app.pid).length, { timeout: 15_000 }).toBeGreaterThan(0);
    restarted = childrenOf(app.pid);
    await expect.poll(() => existsSync(signIn), { timeout: 15_000 }).toBe(false);
  } finally {
    await app.stop();
    for (const pid of restarted) process.kill(pid);
  }
  const settings = existsSync(settingsFile(profile))
    ? readFileSync(settingsFile(profile), 'utf8')
    : '';
  expect(settings).not.toContain('"noticeAccepted": true');
});
