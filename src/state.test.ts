import { describe, expect, it } from 'vitest';
import { withShortsAuto, type Preferences } from './state';

const preferences: Preferences = {
  language: 'de',
  updateCheck: true,
  shorts: { auto: false, pauseSeconds: 2, holdOnHover: false, portraitSize: 'separate' },
};

describe('withShortsAuto', () => {
  it('turns only the Shorts auto mode on and keeps every other choice', () => {
    expect(withShortsAuto(preferences)).toEqual({
      language: 'de',
      updateCheck: true,
      shorts: { auto: true, pauseSeconds: 2, holdOnHover: false, portraitSize: 'separate' },
    });
  });
});
