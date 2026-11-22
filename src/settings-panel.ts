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
  ['general-title', 'generalTitle'],
  ['language-label', 'language'],
  ['theme-label', 'theme'],
  ['theme-system', 'themeSystem'],
  ['theme-light', 'themeLight'],
  ['theme-dark', 'themeDark'],
  ['hotkeys-title', 'hotkeysTitle'],
  ['shorts-title', 'shortsTitle'],
  ['shorts-pause-label', 'shortsPause'],
  ['shorts-hold-label', 'shortsHoldOnHover'],
  ['portrait-size-label', 'portraitSize'],
  ['update-check-label', 'updateCheck'],
  ['update-check-note', 'updateCheckLater'],
  ['graphics-acceleration-label', 'graphicsAcceleration'],
  ['graphics-acceleration-note', 'graphicsAccelerationNote'],
  ['restart-question', 'restartQuestion'],
  ['restart-yes', 'restartConfirm'],
  ['restart-no', 'cancel'],
  ['data-title', 'dataTitle'],
  ['reset-explain', 'resetExplain'],
  ['reset', 'resetTitle'],
  ['reset-yes', 'resetConfirm'],
  ['reset-no', 'cancel'],
  ['trademark-note', 'trademarkNote'],
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

// WebView2 takes its arguments only at start, so a change needs a restart; cancelling undoes it.
function wireGraphicsAcceleration(current: () => OverlayState): void {
  const box = element<HTMLInputElement>('graphics-acceleration');
  const confirm = element('restart-confirm');
  box.addEventListener('change', () => {
    confirm.hidden = box.checked === current().graphicsAcceleration;
    if (!confirm.hidden) element('restart-no').focus();
  });
  element('restart-no').addEventListener('click', () => {
    box.checked = current().graphicsAcceleration;
    confirm.hidden = true;
    box.focus();
  });
  element('restart-yes').addEventListener('click', () => {
    void invoke('set_graphics_acceleration', { enabled: box.checked });
  });
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
  wireTheme(change);
  wireShorts(change);
  const updateCheck = element<HTMLInputElement>('update-check');
  updateCheck.addEventListener('change', () =>
    change((p) => ({ ...p, updateCheck: updateCheck.checked })),
  );
}

type Change = (patch: (preferences: Preferences) => Preferences) => void;

const themeRadios = () =>
  element('theme').querySelectorAll<HTMLInputElement>('input[name="theme"]');

function wireTheme(change: Change): void {
  for (const radio of themeRadios()) {
    radio.addEventListener('change', () =>
      change((p) => ({ ...p, theme: radio.value as Preferences['theme'] })),
    );
  }
}

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
  for (const radio of themeRadios()) radio.checked = radio.value === state.theme;
  element<HTMLInputElement>('shorts-pause').value = String(state.shorts.pauseSeconds);
  element<HTMLInputElement>('shorts-hold').checked = state.shorts.holdOnHover;
  element<HTMLSelectElement>('portrait-size').value = state.shorts.portraitSize;
  element<HTMLInputElement>('update-check').checked = state.updateCheck;
  // An open restart question keeps the box as the user just set it.
  if (element('restart-confirm').hidden) {
    element<HTMLInputElement>('graphics-acceleration').checked = state.graphicsAcceleration;
  }
}

export function startSettingsPanel(state: OverlayState, language: Language): StateView {
  let latest = state;
  const panel = element('settings-panel');
  const close = () => void invoke('set_settings_open', { open: false });
  writeTexts(language);
  wireReset();
  wirePreferences(() => latest);
  wireGraphicsAcceleration(() => latest);
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
    if (opening) {
      element('reset-confirm').hidden = true;
      element('restart-confirm').hidden = true;
      element('hotkey-error').textContent = '';
      element('language').focus();
    }
    showValues(next);
    showHotkeys(next.hotkeys);
  };
}
