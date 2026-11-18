// "Video only": lays a service's player over its own page with styles alone; nothing is removed.
import { startBridge, type Status } from './bridge';

/** A kind of page that shows a player, and how to find it there. */
export interface PlayerPage {
  matches: (host: string, path: string) => boolean;
  player: string;
}

export interface VideoOnlyRules {
  pages: readonly PlayerPage[];
  /** Rules that apply under the `floawty-video-only` class on `<html>`. */
  css: string;
}

const CLASS = 'floawty-video-only';
// A page needs a moment after a path change before a missing player means a broken selector.
const SETTLE_MS = 2000;
// The page beneath must not scroll while the player covers it.
const LOCK_SCROLL = `html.${CLASS}, html.${CLASS} body { overflow: hidden !important; }`;

export function createVideoOnly(rules: VideoOnlyRules) {
  let style: HTMLStyleElement | null = null;
  let seenPath = location.pathname;
  let pathChangedAt = Date.now();

  function settled(): boolean {
    if (location.pathname !== seenPath) {
      seenPath = location.pathname;
      pathChangedAt = Date.now();
    }
    return Date.now() - pathChangedAt >= SETTLE_MS;
  }

  function addStyle(): void {
    style ??= document.createElement('style');
    style.textContent = `${LOCK_SCROLL}\n${rules.css}`;
    if (!style.isConnected) (document.head ?? document.documentElement).append(style);
  }

  function show(on: boolean): void {
    const root = document.documentElement;
    if (on) addStyle();
    if (root.classList.contains(CLASS) === on) return;
    root.classList.toggle(CLASS, on);
    // Players size their video on resize; YouTube Shorts would keep the old size otherwise.
    window.dispatchEvent(new Event('resize'));
  }

  /** Applies the wish to the current page; returns whether its player is missing. */
  return function apply(wanted: boolean): boolean {
    const isSettled = settled();
    const { hostname, pathname } = location;
    const page = rules.pages.find((candidate) => candidate.matches(hostname, pathname));
    const found = page !== undefined && document.querySelector(page.player) !== null;
    show(wanted && found);
    return wanted && page !== undefined && !found && isSettled;
  };
}

/** Reads `videoOnly` from floawty's input; null when the input is not floawty's. */
export function readVideoOnly(input: unknown): boolean | null {
  if (typeof input !== 'object' || input === null) return null;
  const value = (input as Record<string, unknown>)['videoOnly'];
  return typeof value === 'boolean' ? value : null;
}

/** The whole page script of a service whose only feature is video only. */
export function startVideoOnlyPage(hosts: readonly string[], rules: VideoOnlyRules): void {
  startBridge(hosts, () => {
    const applyVideoOnly = createVideoOnly(rules);
    let videoOnly = false;
    return (input: unknown): Status => {
      try {
        videoOnly = readVideoOnly(input) ?? videoOnly;
        return {
          aspect: 'landscape',
          problems: applyVideoOnly(videoOnly) ? ['player-missing'] : [],
        };
      } catch {
        return { aspect: 'landscape', problems: [] };
      }
    };
  });
}
