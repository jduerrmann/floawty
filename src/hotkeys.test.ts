import { describe, expect, it } from 'vitest';
import { findConflict, formatHotkey, hotkeyFromKey, type Hotkeys } from './hotkeys';

const press = (
  code: string,
  mods: Partial<Record<'ctrl' | 'alt' | 'shift' | 'meta', boolean>>,
) => ({
  code,
  ctrlKey: mods.ctrl ?? false,
  altKey: mods.alt ?? false,
  shiftKey: mods.shift ?? false,
  metaKey: mods.meta ?? false,
});

const defaults: Hotkeys = {
  toggleVisible: 'Ctrl+Alt+Shift+O',
  clickThrough: 'Ctrl+Alt+Shift+D',
  opacityUp: 'Ctrl+Alt+Shift+Up',
  opacityDown: 'Ctrl+Alt+Shift+Down',
  windowMode: 'Ctrl+Alt+Shift+F',
  playPause: 'Ctrl+Alt+Shift+Space',
  videoOnly: 'Ctrl+Alt+Shift+V',
  zoom: 'Ctrl+Alt+Shift+Z',
  alwaysOnTop: 'Ctrl+Alt+Shift+T',
};

describe('hotkeyFromKey', () => {
  it('turns a key press into the stored form with modifiers in a fixed order', () => {
    expect(hotkeyFromKey(press('KeyK', { shift: true, ctrl: true }))).toEqual({
      ok: true,
      hotkey: 'Ctrl+Shift+K',
    });
    expect(hotkeyFromKey(press('Digit5', { alt: true }))).toEqual({ ok: true, hotkey: 'Alt+5' });
    expect(hotkeyFromKey(press('ArrowLeft', { ctrl: true, alt: true }))).toEqual({
      ok: true,
      hotkey: 'Ctrl+Alt+Left',
    });
    expect(hotkeyFromKey(press('F9', { meta: true, ctrl: true }))).toEqual({
      ok: true,
      hotkey: 'Ctrl+Super+F9',
    });
  });

  it('waits while only modifiers are held', () => {
    expect(hotkeyFromKey(press('ShiftLeft', { shift: true }))).toBeNull();
    expect(hotkeyFromKey(press('ControlRight', { ctrl: true }))).toBeNull();
  });

  it('needs Ctrl, Alt or Win so normal typing is never taken away', () => {
    expect(hotkeyFromKey(press('KeyA', {}))).toEqual({ ok: false, problem: 'hotkeyNeedsModifier' });
    expect(hotkeyFromKey(press('KeyA', { shift: true }))).toEqual({
      ok: false,
      problem: 'hotkeyNeedsModifier',
    });
  });

  it('rejects keys a global hotkey cannot use', () => {
    expect(hotkeyFromKey(press('IntlBackslash', { ctrl: true }))).toEqual({
      ok: false,
      problem: 'hotkeyUnsupported',
    });
  });
});

describe('findConflict', () => {
  it('names the action that already uses the combination', () => {
    expect(findConflict(defaults, 'opacityUp', 'Ctrl+Alt+Shift+D')).toBe('clickThrough');
    expect(findConflict(defaults, 'opacityUp', 'Ctrl+Alt+Shift+V')).toBe('videoOnly');
    expect(findConflict(defaults, 'opacityUp', 'ctrl+alt+shift+keyz')).toBe('zoom');
  });

  it('compares spellings, not text', () => {
    expect(findConflict(defaults, 'opacityUp', 'shift+ctrl+alt+keyd')).toBe('clickThrough');
    expect(findConflict(defaults, 'clickThrough', 'Control+Alt+Shift+ArrowDown')).toBe(
      'opacityDown',
    );
  });

  it('allows keeping the own combination and free combinations', () => {
    expect(findConflict(defaults, 'clickThrough', 'Ctrl+Alt+Shift+D')).toBeNull();
    expect(findConflict(defaults, 'clickThrough', 'Ctrl+Alt+K')).toBeNull();
  });
});

describe('formatHotkey', () => {
  it('shows German key names on German systems', () => {
    expect(formatHotkey('Ctrl+Alt+Shift+D', 'de')).toBe('Strg+Alt+Umschalt+D');
    expect(formatHotkey('Ctrl+Alt+Shift+Space', 'de')).toBe('Strg+Alt+Umschalt+Leertaste');
  });

  it('shows arrows as symbols and Super as Win', () => {
    expect(formatHotkey('Ctrl+Alt+Shift+Up', 'en')).toBe('Ctrl+Alt+Shift+↑');
    expect(formatHotkey('Super+Alt+Down', 'en')).toBe('Win+Alt+↓');
  });
});
