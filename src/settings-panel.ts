// The settings inside the overlay; the shell pauses and hides the service meanwhile.
import { invoke } from '@tauri-apps/api/core';
import { createHotkeyList } from './hotkey-list';
import { t, type Language, type MessageKey } from './i18n';
import { preferencesOf, type OverlayState, type Preferences, type StateView } from './state';

function element<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

const TEXTS: [string, MessageKey][] = [
  ['settings-title', 'settingsTitle'],
  ['settings-done', 'done'],
  ['language-label', 'language'],
  ['hotkeys-title', 'hotkeysTitle'],
  ['shorts-title', 'shortsTitle'],
  ['shorts-pause-label', 'shortsPause'],
  ['shorts-hold-label', 'shortsHoldOnHover'],
  ['portrait-size-label', 'portraitSize'],
  ['update-check-label', 'updateCheck'],
  ['update-check-note', 'updateCheckLater'],
  ['reset-title', 'resetTitle'],
  ['reset-explain', 'resetExplain'],
  ['reset', 'resetTitle'],
  ['reset-yes', 'resetConfirm'],
  ['reset-no', 'cancel'],
];
const PORTRAIT_OPTIONS: Record<string, MessageKey> = {
  rotated: 'portraitRotated',
  separate: 'portraitSeparate',
};
const LANGUAGE_OPTIONS: Record<string, MessageKey> = {
  system: 'languageSystem',
  en: 'languageEn',
  de: 'languageDe',
};

function writeTexts(language: Language): void {
  for (const [id, key] of TEXTS) element(id).textContent = t(language, key);
  for (const option of element<HTMLSelectElement>('language').options) {
    option.textContent = t(language, LANGUAGE_OPTIONS[option.value] ?? 'languageSystem');
  }
  for (const option of element<HTMLSelectElement>('portrait-size').options) {
    option.textContent = t(language, PORTRAIT_OPTIONS[option.value] ?? 'portraitRotated');
  }
}

function wireReset(): void {
  const confirm = element('reset-confirm');
  element('reset').addEventListener('click', () => {
    confirm.hidden = false;
    element('reset-no').focus();
  });
  element('reset-no').addEventListener('click', () => (confirm.hidden = true));
  element('reset-yes').addEventListener('click', () => void invoke('reset_all_data'));
}

function wirePreferences(current: () => OverlayState): void {
  const change = (patch: (preferences: Preferences) => Preferences) =>
    void invoke('set_preferences', { preferences: patch(preferencesOf(current())) });
  const language = element<HTMLSelectElement>('language');
  language.addEventListener('change', () =>
    change((p) => ({ ...p, language: language.value as Preferences['language'] })),
  );
  const pause = element<HTMLInputElement>('shorts-pause');
  pause.addEventListener('change', () => {
    if (Number.isNaN(pause.valueAsNumber)) return;
    change((p) => ({ ...p, shorts: { ...p.shorts, pauseSeconds: pause.valueAsNumber } }));
  });
  wireShorts(change);
  const updateCheck = element<HTMLInputElement>('update-check');
  updateCheck.addEventListener('change', () =>
    change((p) => ({ ...p, updateCheck: updateCheck.checked })),
  );
}

type Change = (patch: (preferences: Preferences) => Preferences) => void;

function wireShorts(change: Change): void {
  const shorts = (patch: Partial<Preferences['shorts']>) =>
    change((p) => ({ ...p, shorts: { ...p.shorts, ...patch } }));
  const hold = element<HTMLInputElement>('shorts-hold');
  hold.addEventListener('change', () => shorts({ holdOnHover: hold.checked }));
  const size = element<HTMLSelectElement>('portrait-size');
  size.addEventListener('change', () =>
    shorts({ portraitSize: size.value as Preferences['shorts']['portraitSize'] }),
  );
}

function showValues(state: OverlayState): void {
  element<HTMLSelectElement>('language').value = state.language;
  element<HTMLInputElement>('shorts-pause').value = String(state.shorts.pauseSeconds);
  element<HTMLInputElement>('shorts-hold').checked = state.shorts.holdOnHover;
  element<HTMLSelectElement>('portrait-size').value = state.shorts.portraitSize;
  element<HTMLInputElement>('update-check').checked = state.updateCheck;
}

export function startSettingsPanel(state: OverlayState, language: Language): StateView {
  let latest = state;
  const panel = element('settings-panel');
  const close = () => void invoke('set_settings_open', { open: false });
  writeTexts(language);
  wireReset();
  wirePreferences(() => latest);
  element('settings-done').addEventListener('click', close);
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !event.defaultPrevented) close();
  });
  const showHotkeys = createHotkeyList(language, element('hotkey-list'), element('hotkey-error'));

  return (next) => {
    const opening = next.settingsOpen && panel.hidden;
    latest = next;
    panel.hidden = !next.settingsOpen;
    element('home').hidden = next.settingsOpen;
    showValues(next);
    showHotkeys(next.hotkeys);
    if (opening) {
      element('reset-confirm').hidden = true;
      element('hotkey-error').textContent = '';
      element('language').focus();
    }
  };
}
