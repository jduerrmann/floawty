// floawty's state from the shell, shared by the home page and the bar.
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { Hotkeys } from './hotkeys';
import { resolveLanguage, type Language, type LanguageChoice } from './i18n';

export interface Shorts {
  auto: boolean;
  pauseSeconds: number;
  holdOnHover: boolean;
  portraitSize: 'rotated' | 'separate';
}

export interface Preferences {
  language: LanguageChoice;
  shorts: Shorts;
  updateCheck: boolean;
}

export interface OverlayState extends Preferences {
  mode: 'floaty' | 'window';
  opacity: number;
  clickThrough: boolean;
  serviceId: string | null;
  settingsOpen: boolean;
  hotkeys: Hotkeys;
  pageProblem: boolean;
}

export type StateView = (state: OverlayState) => void;

export function preferencesOf(state: OverlayState): Preferences {
  return { language: state.language, shorts: state.shorts, updateCheck: state.updateCheck };
}

/** Starts a page in the chosen language; a new language reloads it, so no text is left behind. */
export async function startWithState(
  start: (state: OverlayState, language: Language) => StateView,
): Promise<void> {
  const state = await invoke<OverlayState>('overlay_state');
  const language = resolveLanguage(state.language, navigator.languages);
  document.documentElement.lang = language;
  const show = start(state, language);
  show(state);
  await listen<OverlayState>('overlay-state', ({ payload }) => {
    if (resolveLanguage(payload.language, navigator.languages) !== language) location.reload();
    else show(payload);
  });
}
