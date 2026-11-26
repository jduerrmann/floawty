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

export type ThemeChoice = 'system' | 'light' | 'dark';

export interface Preferences {
  language: LanguageChoice;
  theme: ThemeChoice;
  animations: boolean;
  shorts: Shorts;
  updateCheck: boolean;
}

export interface OverlayState extends Preferences {
  graphicsAcceleration: boolean;
  mode: 'floaty' | 'window';
  opacity: number;
  clickThrough: boolean;
  serviceId: string | null;
  settingsOpen: boolean;
  hotkeys: Hotkeys;
  videoOnly: boolean;
  zoom: boolean;
  alwaysOnTop: boolean;
  pageProblems: PageProblem[];
  /** The service whose page has not started yet; its tile shows that it opens. */
  opening: string | null;
}

export type PageProblem = 'controls-missing' | 'player-missing';

/** The preferences with the auto mode on, as the Shorts and TikTok tiles open. */
export function withShortsAuto(preferences: Preferences): Preferences {
  return { ...preferences, shorts: { ...preferences.shorts, auto: true } };
}

export type StateView = (state: OverlayState) => void;

export function preferencesOf(state: OverlayState): Preferences {
  const { language, theme, animations, shorts, updateCheck } = state;
  return { language, theme, animations, shorts, updateCheck };
}

// tokens.css pins the scheme from this; the session copy is for reloads, which the startup script reads.
function showTheme(theme: ThemeChoice): void {
  document.documentElement.dataset.theme = theme;
  sessionStorage.setItem('theme', theme);
}

// No startup script: nothing moves before the state arrives.
function showMotion(animations: boolean): void {
  document.documentElement.toggleAttribute('data-still', !animations);
}

/** Starts a page in the chosen language; a new language reloads it, so no text is left behind. */
export async function startWithState(
  start: (state: OverlayState, language: Language) => StateView,
): Promise<void> {
  let heard: OverlayState | undefined;
  let showChange: StateView = (payload) => (heard = payload);
  // Listening before fetching: a change in between would otherwise never reach this page.
  await listen<OverlayState>('overlay-state', ({ payload }) => showChange(payload));
  const fetched = await invoke<OverlayState>('overlay_state');
  // Every change is emitted, so a change heard while fetching is at least as new as the reply.
  const state = heard ?? fetched;
  const language = resolveLanguage(state.language, navigator.languages);
  document.documentElement.lang = language;
  showTheme(state.theme);
  showMotion(state.animations);
  const show = start(state, language);
  show(state);
  showChange = (payload) => {
    showTheme(payload.theme);
    showMotion(payload.animations);
    if (resolveLanguage(payload.language, navigator.languages) !== language) location.reload();
    else show(payload);
  };
}
