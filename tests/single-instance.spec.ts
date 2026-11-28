// Only one floawty per data folder: a second start brings the first one forward and ends.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { freshProfile, startFloawty, type Floawty, type Profile } from './app';
import { minimize, windowFlags } from './desktop';
import { alive } from './update-server';

function profileReady(): Profile {
  const profile = freshProfile();
  mkdirSync(profile.dataDir, { recursive: true });
  const settings = { noticeAccepted: true, language: 'en' };
  writeFileSync(path.join(profile.dataDir, 'settings.json'), JSON.stringify(settings));
  return profile;
}

// Without the test's debug port, so two floawtys can run at once.
function start(profile: Profile): Promise<Floawty> {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    FLOAWTY_DATA_DIR: profile.dataDir,
    WEBVIEW2_USER_DATA_FOLDER: profile.webviewDir,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: '--disable-background-networking --mute-audio',
  };
  return startFloawty(env);
}

function logOf(profile: Profile): string {
  const file = path.join(profile.dataDir, 'logs', 'floawty.log');
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
}

const visible = (floawty: Floawty) => () => windowFlags(floawty.pid).visible;

test('a second start on the same data brings the hidden floawty back and ends', async () => {
  const profile = profileReady();
  const first = await start(profile);
  try {
    // floawty registers its hotkeys shortly after its window shows.
    const pressed = () =>
      first.hotkey('Ctrl+Alt+Shift+O').then(
        () => true,
        () => false,
      );
    await expect.poll(pressed).toBe(true);
    await expect.poll(visible(first)).toBe(false);
    // The launcher may take the first floawty's window, shown again, for the second one's.
    const second = await start(profile).catch(() => null);
    try {
      if (second) await expect.poll(() => alive(second.pid)).toBe(false);
      await expect.poll(visible(first)).toBe(true);
      expect(alive(first.pid)).toBe(true);
      expect(logOf(profile)).toContain('a second start brought floawty to the front');
    } finally {
      await second?.stop();
    }
  } finally {
    await first.stop();
  }
});

test('a second start restores a minimized floawty', async () => {
  const profile = profileReady();
  const first = await start(profile);
  try {
    minimize(first.pid);
    await expect.poll(() => windowFlags(first.pid).minimized).toBe(true);
    const second = await start(profile).catch(() => null);
    try {
      await expect.poll(() => windowFlags(first.pid).minimized).toBe(false);
      if (second) await expect.poll(() => alive(second.pid)).toBe(false);
    } finally {
      await second?.stop();
    }
  } finally {
    await first.stop();
  }
});

test('floawtys with different data folders run side by side', async () => {
  const first = await start(profileReady());
  let second: Floawty | undefined;
  try {
    second = await start(profileReady());
    expect(windowFlags(second.pid).visible).toBe(true);
    expect(windowFlags(first.pid).visible).toBe(true);
  } finally {
    await second?.stop();
    await first.stop();
  }
});
