export interface ShortsConfig {
  auto: boolean;
  pauseSeconds: number;
  holdOnHover: boolean;
}

export type ShortsEvent =
  | { type: 'config'; config: ShortsConfig; now: number }
  | { type: 'hover'; hovered: boolean; now: number }
  | { type: 'active'; active: boolean; now: number }
  | { type: 'media-started'; now: number }
  | { type: 'time'; currentTime: number; duration: number; now: number }
  | { type: 'ended'; now: number }
  | { type: 'slide'; index: number; count: number; now: number }
  | { type: 'timer'; now: number }
  | { type: 'gesture'; now: number };

export type ShortsAction =
  { type: 'pause' } | { type: 'play' } | { type: 'advance' } | { type: 'schedule'; at: number };

type Phase = 'playing' | 'waiting' | 'advancing' | 'blocked';

export interface ShortsState {
  phase: Phase;
  config: ShortsConfig;
  hovered: boolean;
  active: boolean;
  /** A Short that started while floawty was hidden or covered; its first sample pauses it. */
  startedUnseen: boolean;
  previousTime: number | null;
  /** The pictures of a slideshow (TikTok photo series) shown this round, the current one last. */
  slidesSeen: readonly number[];
  dueAt: number | null;
}

interface StepResult {
  state: ShortsState;
  actions: ShortsAction[];
}

const END_WINDOW_SECONDS = 1;
const START_WINDOW_SECONDS = 1;
const ADVANCE_TIMEOUT_MS = 3000;

export function initialShorts(): ShortsState {
  return {
    phase: 'playing',
    config: { auto: false, pauseSeconds: 1, holdOnHover: true },
    hovered: false,
    active: true,
    startedUnseen: false,
    previousTime: null,
    slidesSeen: [],
    dueAt: null,
  };
}

export function step(state: ShortsState, event: ShortsEvent): StepResult {
  switch (event.type) {
    case 'config':
      return onConfig(state, event.config);
    case 'hover':
      return onHover({ ...state, hovered: event.hovered });
    case 'active':
      return onActive(state, event.active);
    case 'media-started':
      return idle({
        ...state,
        previousTime: null,
        slidesSeen: [],
        startedUnseen: !state.active,
      });
    case 'time':
      return onTime(state, event);
    case 'ended':
      return onRunComplete(state, event.now);
    case 'slide':
      return onSlide(state, event);
    case 'timer':
      return onTimer(state, event.now);
    case 'gesture':
      return state.phase === 'blocked' ? idle(state) : unchanged(state);
  }
}

function unchanged(state: ShortsState): StepResult {
  return { state, actions: [] };
}

function idle(state: ShortsState, actions: ShortsAction[] = []): StepResult {
  return { state: { ...state, phase: 'playing', dueAt: null }, actions };
}

function onConfig(state: ShortsState, config: ShortsConfig): StepResult {
  const next = { ...state, config };
  if (config.auto) return unchanged(next);
  if (state.phase === 'waiting') return idle(next, [{ type: 'play' }]);
  if (state.phase === 'blocked') return idle(next);
  return unchanged(next);
}

// A hidden or paused-by-floawty video must stay as it is, so going inactive sends no action.
function onActive(state: ShortsState, active: boolean): StepResult {
  const next = { ...state, active, startedUnseen: false };
  return active ? unchanged(next) : idle(next);
}

function onHover(state: ShortsState): StepResult {
  const holding = state.hovered && state.config.holdOnHover;
  if (state.phase === 'waiting' && holding) return idle(state, [{ type: 'play' }]);
  return unchanged(state);
}

function onTime(
  state: ShortsState,
  event: { currentTime: number; duration: number; now: number },
): StepResult {
  // An advance sent just before hiding starts the next Short where nobody sees or hears it.
  if (state.startedUnseen)
    return { state: { ...state, startedUnseen: false }, actions: [{ type: 'pause' }] };
  if (!Number.isFinite(event.duration) || event.duration <= 0) return unchanged(state);
  const { previousTime } = state;
  const sampled = { ...state, previousTime: event.currentTime };
  if (previousTime === null) return unchanged(sampled);
  const nearEnd = previousTime >= event.duration - END_WINDOW_SECONDS;
  const nearStart = event.currentTime <= START_WINDOW_SECONDS;
  const jumpedBack = event.currentTime < previousTime;
  return nearEnd && nearStart && jumpedBack
    ? onRunComplete(sampled, event.now)
    : unchanged(sampled);
}

// A slideshow has run once when, after every picture was shown, the next one comes up.
function onSlide(
  state: ShortsState,
  event: { index: number; count: number; now: number },
): StepResult {
  const seen = state.slidesSeen;
  if (seen.at(-1) === event.index) return unchanged(state);
  const round = seen.length > 0 && event.count > 1 && new Set(seen).size >= event.count;
  if (round) return onRunComplete({ ...state, slidesSeen: [event.index] }, event.now);
  return unchanged({ ...state, slidesSeen: [...seen, event.index] });
}

function onRunComplete(state: ShortsState, now: number): StepResult {
  const { auto, pauseSeconds, holdOnHover } = state.config;
  if (state.phase !== 'playing' || !auto || !state.active) return unchanged(state);
  if (state.hovered && holdOnHover) return unchanged(state);
  if (pauseSeconds > 0) {
    const dueAt = now + pauseSeconds * 1000;
    return {
      state: { ...state, phase: 'waiting', dueAt },
      actions: [{ type: 'pause' }, { type: 'schedule', at: dueAt }],
    };
  }
  return advance(state, now);
}

function advance(state: ShortsState, now: number): StepResult {
  const dueAt = now + ADVANCE_TIMEOUT_MS;
  return {
    state: { ...state, phase: 'advancing', dueAt },
    actions: [{ type: 'advance' }, { type: 'schedule', at: dueAt }],
  };
}

function onTimer(state: ShortsState, now: number): StepResult {
  if (state.dueAt === null || now < state.dueAt) return unchanged(state);
  if (state.phase === 'waiting') return advance(state, now);
  // A click that brought no new Short (seen before the user's first real click) waits for one.
  if (state.phase === 'advancing') {
    return { state: { ...state, phase: 'blocked', dueAt: null }, actions: [{ type: 'play' }] };
  }
  return unchanged(state);
}
