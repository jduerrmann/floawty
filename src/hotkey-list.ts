// The hotkeys in the settings: each shown in the user's language, changed by pressing new keys.
import { invoke } from '@tauri-apps/api/core';
import {
  findConflict,
  HOTKEY_ACTIONS,
  hotkeyFromKey,
  hotkeyParts,
  type HotkeyAction,
  type Hotkeys,
} from './hotkeys';
import { t, type Language, type MessageKey } from './i18n';

const ACTION_LABELS: Record<HotkeyAction, MessageKey> = {
  toggleVisible: 'hotkeyToggleVisible',
  clickThrough: 'hotkeyClickThrough',
  opacityUp: 'hotkeyOpacityUp',
  opacityDown: 'hotkeyOpacityDown',
  windowMode: 'hotkeyWindowMode',
  playPause: 'hotkeyPlayPause',
  videoOnly: 'hotkeyVideoOnly',
  zoom: 'hotkeyZoom',
  alwaysOnTop: 'hotkeyAlwaysOnTop',
};

function row(language: Language, action: HotkeyAction): [HTMLElement, HTMLButtonElement] {
  const item = document.createElement('div');
  item.className = 'hotkey-row';
  const name = document.createElement('span');
  name.textContent = t(language, ACTION_LABELS[action]);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'hotkey';
  button.dataset.action = action;
  button.title = t(language, 'hotkeyChange', { action: t(language, ACTION_LABELS[action]) });
  item.append(name, button);
  return [item, button];
}

function keyChip(key: string): HTMLElement {
  const chip = document.createElement('kbd');
  chip.textContent = key;
  return chip;
}

/** Key chips for a hotkey, or the recording prompt for null; the name holds the whole combination. */
function showKeys(
  language: Language,
  button: HTMLButtonElement,
  action: HotkeyAction,
  hotkey: string | null,
): void {
  const parts = hotkey === null ? [] : hotkeyParts(hotkey, language);
  const keys = hotkey === null ? t(language, 'hotkeyRecording') : parts.join('+');
  button.toggleAttribute('data-recording', hotkey === null);
  button.replaceChildren(...(hotkey === null ? [keys] : parts.map(keyChip)));
  const name = t(language, ACTION_LABELS[action]);
  button.setAttribute('aria-label', t(language, 'hotkeyKeys', { action: name, keys }));
}

type KeyOutcome = { hotkey: string } | { problem: string } | null;

/** What a pressed key means while recording: a new hotkey, a problem, or nothing yet. */
function judgeKey(
  language: Language,
  hotkeys: Hotkeys | null,
  action: HotkeyAction,
  event: KeyboardEvent,
): KeyOutcome {
  const result = hotkeyFromKey(event);
  if (!result) return null;
  if (!result.ok) return { problem: t(language, result.problem) };
  const other = hotkeys && findConflict(hotkeys, action, result.hotkey);
  if (other) {
    return { problem: t(language, 'hotkeyInUse', { action: t(language, ACTION_LABELS[other]) }) };
  }
  return { hotkey: result.hotkey };
}

export function createHotkeyList(
  language: Language,
  list: HTMLElement,
  error: HTMLElement,
): (hotkeys: Hotkeys) => void {
  let hotkeys: Hotkeys | null = null;
  let recording: HotkeyAction | null = null;
  const buttons = new Map<HotkeyAction, HTMLButtonElement>();

  const show = () => {
    for (const [action, button] of buttons) {
      showKeys(language, button, action, recording === action ? null : (hotkeys?.[action] ?? ''));
    }
  };
  // While recording, floawty's own hotkeys are off, so their keys reach this page.
  const record = async (action: HotkeyAction | null) => {
    recording = action;
    show();
    await invoke('set_hotkeys_paused', { paused: action !== null });
  };
  const save = async (action: HotkeyAction, hotkey: string) => {
    await record(null);
    try {
      await invoke('set_hotkey', { action, hotkey });
    } catch (problem) {
      error.textContent = t(language, problem === 'hotkeyUnsupported' ? problem : 'hotkeyTaken');
    }
  };
  const onKey = (action: HotkeyAction, event: KeyboardEvent) => {
    if (recording !== action || event.key === 'Tab') return;
    event.preventDefault();
    if (event.key === 'Escape') {
      void record(null);
      return;
    }
    const outcome = judgeKey(language, hotkeys, action, event);
    if (!outcome) return;
    error.textContent = 'problem' in outcome ? outcome.problem : '';
    if ('hotkey' in outcome) void save(action, outcome.hotkey);
  };

  for (const action of HOTKEY_ACTIONS) {
    const [item, button] = row(language, action);
    button.addEventListener('click', () => {
      error.textContent = '';
      void record(recording === action ? null : action);
    });
    button.addEventListener('keydown', (event) => onKey(action, event));
    button.addEventListener('blur', () => {
      if (recording === action) void record(null);
    });
    buttons.set(action, button);
    list.append(item);
  }
  return (next) => {
    hotkeys = next;
    show();
  };
}
