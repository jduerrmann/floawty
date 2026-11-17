// Global hotkeys as the settings store them: recorded from key presses, checked, shown.
import { t, type Language } from './i18n';

export type HotkeyAction =
  'toggleVisible' | 'clickThrough' | 'opacityUp' | 'opacityDown' | 'windowMode' | 'playPause';

export type Hotkeys = Record<HotkeyAction, string>;

export const HOTKEY_ACTIONS: readonly HotkeyAction[] = [
  'toggleVisible',
  'clickThrough',
  'opacityUp',
  'opacityDown',
  'windowMode',
  'playPause',
];

export interface KeyPress {
  code: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

export type Recorded =
  | { ok: true; hotkey: string }
  | { ok: false; problem: 'hotkeyNeedsModifier' | 'hotkeyUnsupported' };

const MODIFIER_CODES = /^(Control|Alt|Shift|Meta|OS)(Left|Right)?$/;
const ARROWS: Record<string, string> = { Up: '↑', Down: '↓', Left: '←', Right: '→' };
// Keys the global-shortcut plugin accepts (its parse_key), as KeyboardEvent.code values.
const NAMED_KEYS = new Set([
  'Space', 'Enter', 'Tab', 'Backspace', 'Delete', 'Insert', 'Home', 'End', 'PageUp',
  'PageDown', 'Pause', 'Minus', 'Equal', 'Comma', 'Period', 'Slash', 'Semicolon', 'Quote',
  'Backquote', 'Backslash', 'BracketLeft', 'BracketRight', 'NumpadAdd', 'NumpadSubtract',
  'NumpadMultiply', 'NumpadDivide', 'NumpadDecimal', 'NumpadEnter',
]); // prettier-ignore

/** The stored name of a key, or null if a global hotkey cannot use it. */
function keyName(code: string): string | null {
  const letterOrDigit = /^(?:Key([A-Z])|Digit(\d))$/.exec(code);
  if (letterOrDigit) return letterOrDigit[1] ?? letterOrDigit[2] ?? null;
  const arrow = /^Arrow(Up|Down|Left|Right)$/.exec(code);
  if (arrow) return arrow[1] ?? null;
  if (/^(F([1-9]|1\d|2[0-4])|Numpad\d)$/.test(code) || NAMED_KEYS.has(code)) return code;
  return null;
}

/** Turns a key press into a hotkey; null while only modifiers are held. */
export function hotkeyFromKey(press: KeyPress): Recorded | null {
  if (MODIFIER_CODES.test(press.code)) return null;
  if (!press.ctrlKey && !press.altKey && !press.metaKey) {
    return { ok: false, problem: 'hotkeyNeedsModifier' };
  }
  const key = keyName(press.code);
  if (!key) return { ok: false, problem: 'hotkeyUnsupported' };
  const parts = [
    press.ctrlKey && 'Ctrl',
    press.altKey && 'Alt',
    press.shiftKey && 'Shift',
    press.metaKey && 'Super',
    key,
  ].filter((part): part is string => Boolean(part));
  return { ok: true, hotkey: parts.join('+') };
}

const MODIFIER_ALIASES: Record<string, string> = {
  CTRL: 'Ctrl', CONTROL: 'Ctrl', ALT: 'Alt', OPTION: 'Alt', SHIFT: 'Shift',
  SUPER: 'Super', CMD: 'Super', COMMAND: 'Super',
}; // prettier-ignore
const MODIFIER_ORDER = ['Ctrl', 'Alt', 'Shift', 'Super'];

/** One spelling per combination, so "shift+ctrl+keyd" equals "Ctrl+Shift+D". */
function canonical(hotkey: string): string {
  const modifiers = new Set<string>();
  let key = '';
  for (const token of hotkey.split('+').map((part) => part.trim().toUpperCase())) {
    const modifier = MODIFIER_ALIASES[token];
    if (modifier) modifiers.add(modifier);
    else key = token.replace(/^(KEY|DIGIT|ARROW)(?=.)/, '');
  }
  return [...MODIFIER_ORDER.filter((m) => modifiers.has(m)), key].join('+');
}

/** The other action that already uses this combination, if any. */
export function findConflict(
  hotkeys: Hotkeys,
  action: HotkeyAction,
  hotkey: string,
): HotkeyAction | null {
  const wanted = canonical(hotkey);
  const other = HOTKEY_ACTIONS.find((a) => a !== action && canonical(hotkeys[a]) === wanted);
  return other ?? null;
}

/** The hotkey with the key names of the user's language, e.g. Strg+Alt+Umschalt+D. */
export function formatHotkey(hotkey: string, language: Language): string {
  const names: Record<string, string> = {
    Ctrl: t(language, 'keyCtrl'),
    Shift: t(language, 'keyShift'),
    Super: t(language, 'keyWin'),
    Space: t(language, 'keySpace'),
    ...ARROWS,
  };
  return hotkey
    .split('+')
    .map((part) => names[part] ?? part)
    .join('+');
}
