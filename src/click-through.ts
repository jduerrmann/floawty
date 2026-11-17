// Shows that click-through is on: a corner dot, plus a hint for the first seconds.
import { t, type Language } from './i18n';

const HINT_SECONDS = 4;

export interface OverlayState {
  mode: 'floaty' | 'window';
  opacity: number;
  clickThrough: boolean;
  clickThroughHotkey: string;
}

export function createClickThroughIndicator(language: Language): (state: OverlayState) => void {
  const dot = document.getElementById('click-through-dot') as HTMLElement;
  const hint = document.getElementById('click-through-hint') as HTMLElement;
  dot.title = t(language, 'clickThroughDot');
  let wasOn = false;
  let hideHint: number | undefined;

  return (state) => {
    dot.hidden = !state.clickThrough;
    if (state.clickThrough && !wasOn) {
      hint.textContent = t(language, 'clickThroughHint', { hotkey: state.clickThroughHotkey });
      hint.hidden = false;
      window.clearTimeout(hideHint);
      hideHint = window.setTimeout(() => (hint.hidden = true), HINT_SECONDS * 1000);
    }
    if (!state.clickThrough) hint.hidden = true;
    wasOn = state.clickThrough;
  };
}
