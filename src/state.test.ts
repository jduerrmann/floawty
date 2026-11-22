import { describe, expect, it } from 'vitest';
import { preferencesOf, withShortsAuto, type OverlayState, type Preferences } from './state';

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
