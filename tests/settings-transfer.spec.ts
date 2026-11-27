// Export and import of settings through the text commands; the native file dialogs are not driven.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { freshProfile, launch, type Profile } from './app';

const ALLOWED = [
  'alwaysOnTop',
  'animations',
  'customTiles',
  'fullscreenInWindow',
  'graphicsAcceleration',
  'hotkeys',
  'keepAwake',
  'kind',
  'language',
  'opacity',
  'shorts',
  'theme',
  'version',
  'videoOnly',
  'zoom',
];

const TILE = { id: 'custom-1', name: 'Example', url: 'https://www.example.org/' };

const settingsFile = (profile: Profile) => path.join(profile.dataDir, 'settings.json');
const savedSettings = (profile: Profile) =>
  JSON.parse(readFileSync(settingsFile(profile), 'utf8')) as Record<string, unknown>;

function profileWith(settings: Record<string, unknown>): Profile {
  const profile = freshProfile();
  mkdirSync(profile.dataDir, { recursive: true });
  writeFileSync(settingsFile(profile), JSON.stringify(settings));
  return profile;
}

/** What a command answered, or the error code it rejected with. */
function call(page: Page, command: string, args?: Record<string, unknown>): Promise<unknown> {
  return page.evaluate(
    ([name, payload]) =>
      (
        window as unknown as {
          __TAURI_INTERNALS__: { invoke: (c: string, a?: unknown) => Promise<unknown> };
        }
      ).__TAURI_INTERNALS__
        .invoke(name as string, payload)
        .then(
          (value) => ({ ok: value }),
          (error: unknown) => ({ error: String(error) }),
        ),
    [command, args] as const,
  );
}

const SOURCE = {
  opacity: 0.6,
  language: 'en',
  customTiles: [TILE],
  hotkeys: { zoom: 'Ctrl+Alt+Shift+K' },
  noticeAccepted: true,
  updateCheck: true,
  mode: 'window',
  floaty: { x: 10, y: 10, width: 400, height: 225 },
  lastService: { id: 'custom-1', url: TILE.url, allowedDomains: ['example.org'] },
};

async function exportedText(): Promise<string> {
  const app = await launch(profileWith(SOURCE));
  try {
    const answer = (await call(app.home, 'settings_export_text')) as { ok: string };
    return answer.ok;
  } finally {
    await app.stop();
  }
}

test('an export holds only the allowed keys and never sign-in state, consent or the last page', async () => {
  const exported = JSON.parse(await exportedText()) as Record<string, unknown>;
  expect(Object.keys(exported).sort()).toEqual(ALLOWED);
  expect(exported.kind).toBe('floawty-settings');
  expect(exported.opacity).toBe(0.6);
  expect(exported.customTiles).toEqual([TILE]);
});

test('an import on another profile applies the settings at once and keeps its own consent', async () => {
  const text = await exportedText();
  const profile = profileWith({ language: 'en' });
  const app = await launch(profile);
  try {
    expect(await call(app.home, 'check_import_text', { text })).toEqual({
      ok: { restartNeeded: false, graphicsAcceleration: true },
    });
    const applied = (await call(app.home, 'apply_import')) as { ok: { restartNeeded: boolean } };
    expect(applied.ok.restartNeeded).toBe(false);
    const saved = savedSettings(profile);
    expect(saved.opacity).toBe(0.6);
    expect(saved.customTiles).toEqual([TILE]);
    expect(saved.noticeAccepted).toBe(false);
    expect(saved.updateCheck).toBe(false);
    expect(saved.lastService).toBeNull();
    expect(saved.mode).toBe('floaty');
    const state = (await call(app.home, 'overlay_state')) as { ok: { opacity: number } };
    expect(state.ok.opacity).toBe(0.6);
    // The hidden launcher knows which hotkeys floawty registered: the imported one at once, the old one no more.
    if (process.env.FLOAWTY_TEST_HIDDEN === '1') {
      await app.hotkey('Ctrl+Alt+Shift+K');
      await expect(app.hotkey('Ctrl+Alt+Shift+Z')).rejects.toThrow();
    }
  } finally {
    await app.stop();
  }
});

test('files that are not a valid export of this floawty change nothing and say why', async () => {
  const profile = profileWith({ language: 'en', opacity: 0.9 });
  const app = await launch(profile);
  try {
    const exported = JSON.parse(
      await call(app.home, 'settings_export_text').then((a) => (a as { ok: string }).ok),
    ) as Record<string, unknown>;
    const cases: [string, string][] = [
      ['{ broken', 'broken'],
      ['{}', 'notExport'],
      ['{"name": "something else", "version": 1}', 'notExport'],
      [JSON.stringify({ ...exported, version: 2 }), 'newerVersion'],
      [JSON.stringify({ ...exported, opacity: 'high' }), 'broken'],
      [JSON.stringify({ ...exported, theme: 'sepia' }), 'broken'],
      [JSON.stringify({ ...exported, hotkeys: { toggleVisible: 'Shift+K' } }), 'invalidHotkey'],
      [
        JSON.stringify({ ...exported, customTiles: [{ ...TILE, url: 'ftp://example.org/' }] }),
        'invalidTile',
      ],
    ];
    for (const [text, code] of cases) {
      expect(await call(app.home, 'check_import_text', { text }), text).toEqual({ error: code });
    }
    expect(await call(app.home, 'apply_import')).toEqual({ error: 'nothing' });
    expect(savedSettings(profile).opacity).toBe(0.9);
  } finally {
    await app.stop();
  }
});

test('an imported graphics acceleration waits for the restart question', async () => {
  const profile = profileWith({ language: 'en' });
  const app = await launch(profile);
  try {
    const answer = (await call(app.home, 'settings_export_text')) as { ok: string };
    const text = JSON.stringify({ ...JSON.parse(answer.ok), graphicsAcceleration: false });
    await call(app.home, 'check_import_text', { text });
    const applied = (await call(app.home, 'apply_import')) as {
      ok: { restartNeeded: boolean; graphicsAcceleration: boolean };
    };
    expect(applied.ok).toEqual({ restartNeeded: true, graphicsAcceleration: false });
    expect(savedSettings(profile).graphicsAcceleration).toBe(true);
  } finally {
    await app.stop();
  }
});

// The page reloads after an import (a new language reloads it anyway), so what waits must survive it.
test('confirming an import reloads the page, says so and still asks about the restart', async () => {
  const profile = profileWith({ language: 'en', noticeAccepted: true });
  const app = await launch(profile);
  try {
    await app.bar.locator('#settings').click();
    await expect(app.home.locator('#settings-panel')).toBeVisible();
    const answer = (await call(app.home, 'settings_export_text')) as { ok: string };
    const file = {
      ...JSON.parse(answer.ok),
      language: 'de',
      graphicsAcceleration: false,
      customTiles: [TILE],
    };
    await call(app.home, 'check_import_text', { text: JSON.stringify(file) });
    // The file dialog is not driven; the confirm it leads to is shown as it would be.
    await app.home.evaluate(
      () => ((document.getElementById('import-confirm') as HTMLElement).hidden = false),
    );
    await app.home.locator('#import-yes').click();
    await expect(app.home.locator('#settings-title')).toHaveText('Einstellungen');
    await expect(app.home.locator('#transfer-status')).toHaveText('Importiert.');
    await expect(app.home.locator('#restart-confirm')).toBeVisible();
    await expect(app.home.locator('#graphics-acceleration')).not.toBeChecked();
    expect(savedSettings(profile).graphicsAcceleration).toBe(true);
    // Cancelling keeps the old choice; the imported tile is on the tiles behind the settings.
    await app.home.locator('#restart-no').click();
    await expect(app.home.locator('#graphics-acceleration')).toBeChecked();
    await app.home.locator('#settings-done').click();
    await expect(app.home.locator('.tile', { hasText: TILE.name })).toBeVisible();
  } finally {
    await app.stop();
  }
});
