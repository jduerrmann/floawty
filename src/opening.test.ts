import { describe, expect, it } from 'vitest';
import { afterClick, afterFailure, afterState, NOT_OPENING, shownTile } from './opening';

describe('opening', () => {
  it('marks the clicked tile before the shell reports', () => {
    const next = afterClick(NOT_OPENING, 'youtube');
    expect(next).not.toBeNull();
    expect(shownTile(next ?? NOT_OPENING)).toBe('youtube');
  });

  it('takes no click while a tile is opening', () => {
    const opening = afterClick(NOT_OPENING, 'youtube') ?? NOT_OPENING;
    expect(afterClick(opening, 'netflix')).toBeNull();
    const reported = afterState(NOT_OPENING, 'netflix');
    expect(afterClick(reported, 'youtube')).toBeNull();
  });

  it('follows the shell once it reports the opening', () => {
    const clicked = afterClick(NOT_OPENING, 'youtube') ?? NOT_OPENING;
    expect(shownTile(afterState(clicked, 'youtube'))).toBe('youtube');
  });

  it('keeps the click while a state from before it arrives', () => {
    const clicked = afterClick(NOT_OPENING, 'youtube') ?? NOT_OPENING;
    expect(shownTile(afterState(clicked, null))).toBe('youtube');
  });

  it('ends when the shell reports the page took over', () => {
    const clicked = afterClick(NOT_OPENING, 'youtube') ?? NOT_OPENING;
    const reported = afterState(clicked, 'youtube');
    expect(shownTile(afterState(reported, null))).toBeNull();
  });

  it('shows an opening the shell started itself, such as the last service at start', () => {
    expect(shownTile(afterState(NOT_OPENING, 'twitch'))).toBe('twitch');
  });

  it('ends when the open fails before the shell reports', () => {
    const clicked = afterClick(NOT_OPENING, 'youtube') ?? NOT_OPENING;
    expect(shownTile(afterFailure(clicked))).toBeNull();
  });
});
