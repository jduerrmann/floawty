import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  preferencesOf,
  startWithState,
  withShortsAuto,
  type OverlayState,
  type Preferences,
} from './state';

// A fake shell: it answers `overlay_state` and emits `overlay-state` only to listeners it already knows.
const shell = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
  listeners: [] as ((event: { payload: unknown }) => void)[],
  afterReply: () => {},
  emit(state: Record<string, unknown>) {
    shell.state = state;
    for (const listener of shell.listeners) listener({ payload: state });
  },
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: () => {
    const reply = Promise.resolve(shell.state);
    shell.afterReply();
    return reply;
  },
}));

vi.mock('@tauri-apps/api/event', () => ({
  // Like the real shell, a listener counts only once its registration has been handled.
  listen: (_event: string, listener: (event: { payload: unknown }) => void) =>
    Promise.resolve().then(() => {
      shell.listeners.push(listener);
      return () => {};
    }),
}));

const preferences: Preferences = {
  language: 'de',
  theme: 'dark',
  animations: false,
  updateCheck: true,
  shorts: { auto: false, pauseSeconds: 2, holdOnHover: false, portraitSize: 'separate' },
};

describe('preferencesOf', () => {
  it('takes every choice of the settings panel from the state', () => {
    const state = { ...preferences, mode: 'floaty', opacity: 1 } as OverlayState;
    expect(preferencesOf(state)).toEqual(preferences);
  });
});

describe('withShortsAuto', () => {
  it('turns only the Shorts auto mode on and keeps every other choice', () => {
    expect(withShortsAuto(preferences)).toEqual({
      language: 'de',
      theme: 'dark',
      animations: false,
      updateCheck: true,
      shorts: { auto: true, pauseSeconds: 2, holdOnHover: false, portraitSize: 'separate' },
    });
  });
});

describe('startWithState', () => {
  const floaty = { ...preferences, mode: 'floaty', alwaysOnTop: true } as OverlayState;
  const windowMode = { ...floaty, mode: 'window' } as OverlayState;

  beforeEach(() => {
    shell.state = floaty as unknown as Record<string, unknown>;
    shell.listeners = [];
    shell.afterReply = () => {};
    vi.stubGlobal('document', { documentElement: { dataset: {}, toggleAttribute: () => {} } });
    vi.stubGlobal('sessionStorage', { setItem: () => {} });
    vi.stubGlobal('navigator', { languages: ['en'] });
    vi.stubGlobal('location', { reload: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Starts a page; the returned list keeps growing with every mode it shows.
  async function startPage(): Promise<string[]> {
    const shown: string[] = [];
    await startWithState(() => (state) => shown.push(state.mode));
    return shown;
  }

  it('shows a change the shell makes right after it answered the state', async () => {
    shell.afterReply = () => {
      shell.afterReply = () => {};
      shell.emit(windowMode as unknown as Record<string, unknown>);
    };
    expect((await startPage()).at(-1)).toBe('window');
  });

  it('shows the state and every later change', async () => {
    const shown = await startPage();
    shell.emit(windowMode as unknown as Record<string, unknown>);
    expect(shown).toEqual(['floaty', 'window']);
  });

  it('reloads the page when the language changes', async () => {
    await startPage();
    shell.emit({ ...floaty, language: 'en' } as unknown as Record<string, unknown>);
    expect(location.reload).toHaveBeenCalledOnce();
  });
});
