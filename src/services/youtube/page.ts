// YouTube page script: runs the Shorts auto mode and answers floawty's `__floawty.sync` calls.
import { startBridge, type Problem, type Status } from '../bridge';
import { createVideoOnly } from '../video-only';
import { NEXT_CONTROL, SHORT_VIDEO, VIDEO_ONLY } from './selectors';
import {
  initialShorts,
  step,
  type ShortsAction,
  type ShortsConfig,
  type ShortsEvent,
  type ShortsState,
} from './shorts';

const SHORTS_PATH = '/shorts/';
const PROBLEM_AFTER_MS = 2000;
const MEDIA_EVENTS = ['timeupdate', 'ended', 'loadstart'];
const GESTURE_EVENTS = ['pointerdown', 'keydown'];

let state: ShortsState = initialShorts();
let hover = false;
let videoOnly = false;
let active = true;
let problemVerdict = false;
let seenPath = location.pathname;
let pathChangedAt = Date.now();
let advanceFoundNoControl = false;
let timer: number | undefined;
const applyVideoOnly = createVideoOnly(VIDEO_ONLY);

function onShortsPath(): boolean {
  return location.pathname.startsWith(SHORTS_PATH);
}

function shortVideo(): HTMLVideoElement | null {
  return document.querySelector<HTMLVideoElement>(SHORT_VIDEO);
}

function feed(event: ShortsEvent): void {
  const result = step(state, event);
  state = result.state;
  for (const action of result.actions) run(action);
}

function run(action: ShortsAction): void {
  switch (action.type) {
    case 'pause':
      pauseAfterSeek();
      return;
    case 'play':
      shortVideo()
        ?.play()
        .catch(() => undefined);
      return;
    case 'advance':
      advance();
      return;
    case 'schedule':
      schedule(action.at);
      return;
  }
}

// YouTube plays on when paused during its loop seek, so the pause waits for the seek to end.
function pauseAfterSeek(): void {
  const video = shortVideo();
  if (!video) return;
  if (!video.seeking) {
    video.pause();
    return;
  }
  // Hover, auto off, inactivity, a swipe or the timer may have left the wait by then.
  const pauseIfStillWaiting = () => {
    if (state.phase === 'waiting' || !state.active) video.pause();
  };
  video.addEventListener('seeked', () => guarded(pauseIfStillWaiting), { once: true });
}

function advance(): void {
  const control = document.querySelector<HTMLElement>(NEXT_CONTROL);
  if (control) control.click();
  else advanceFoundNoControl = true;
}

function schedule(at: number): void {
  window.clearTimeout(timer);
  timer = window.setTimeout(
    // A timer can fire a millisecond early; the state machine would then drop it.
    () => guarded(() => feed({ type: 'timer', now: Math.max(Date.now(), at) })),
    Math.max(0, at - Date.now()),
  );
}

function guarded(work: () => void): void {
  try {
    work();
  } catch {
    // A broken selector or page quirk must never reach the page.
  }
}

function mediaStarted(): void {
  advanceFoundNoControl = false;
  feed({ type: 'media-started', now: Date.now() });
}

function noticePathChange(): void {
  if (location.pathname === seenPath) return;
  seenPath = location.pathname;
  pathChangedAt = Date.now();
  mediaStarted();
}

function onMedia(event: Event): void {
  guarded(() => {
    noticePathChange();
    const video = shortVideo();
    if (!onShortsPath() || !video || event.target !== video) return;
    const now = Date.now();
    if (event.type === 'loadstart') mediaStarted();
    else if (event.type === 'ended') feed({ type: 'ended', now });
    else feed({ type: 'time', currentTime: video.currentTime, duration: video.duration, now });
  });
}

function onGesture(event: Event): void {
  if (!event.isTrusted) return;
  guarded(() => feed({ type: 'gesture', now: Date.now() }));
}

interface Input {
  shorts: ShortsConfig;
  hover: boolean;
  active: boolean;
  videoOnly: boolean;
}

function isInput(value: unknown): value is Input {
  if (typeof value !== 'object' || value === null) return false;
  const fields = value as Record<string, unknown>;
  const { shorts, hover: hovered, active: isActive, videoOnly: wanted } = fields;
  if (typeof hovered !== 'boolean' || typeof isActive !== 'boolean') return false;
  if (typeof wanted !== 'boolean') return false;
  if (typeof shorts !== 'object' || shorts === null) return false;
  const { auto, pauseSeconds, holdOnHover } = shorts as Record<string, unknown>;
  return (
    typeof auto === 'boolean' &&
    typeof holdOnHover === 'boolean' &&
    typeof pauseSeconds === 'number' &&
    Number.isFinite(pauseSeconds) &&
    pauseSeconds >= 0
  );
}

function applyInput(input: unknown): void {
  if (!isInput(input)) return;
  const now = Date.now();
  const { auto, pauseSeconds, holdOnHover } = state.config;
  const changed = input.shorts;
  if (
    auto !== changed.auto ||
    pauseSeconds !== changed.pauseSeconds ||
    holdOnHover !== changed.holdOnHover
  ) {
    feed({ type: 'config', config: { ...changed }, now });
  }
  if (hover !== input.hover) {
    hover = input.hover;
    feed({ type: 'hover', hovered: hover, now });
  }
  if (active !== input.active) {
    active = input.active;
    feed({ type: 'active', active, now });
  }
  videoOnly = input.videoOnly;
}

function status(): Status {
  const portrait = onShortsPath();
  const settled = Date.now() - pathChangedAt >= PROBLEM_AFTER_MS;
  // Keep the last verdict while the page settles, so the warning does not blink on every Short.
  if (!portrait) problemVerdict = false;
  else if (settled) problemVerdict = !shortVideo() || !document.querySelector(NEXT_CONTROL);
  const problems: Problem[] = [];
  if (portrait && (advanceFoundNoControl || problemVerdict)) problems.push('controls-missing');
  if (applyVideoOnly(videoOnly)) problems.push('player-missing');
  return { aspect: portrait ? 'portrait' : 'landscape', problems };
}

function sync(input: unknown): Status {
  try {
    noticePathChange();
    applyInput(input);
    return status();
  } catch {
    return { aspect: 'landscape', problems: [] };
  }
}

startBridge(['youtube.com'], () => {
  for (const type of MEDIA_EVENTS) document.addEventListener(type, onMedia, true);
  for (const type of GESTURE_EVENTS) document.addEventListener(type, onGesture, true);
  return sync;
});
