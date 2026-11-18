import { describe, expect, it } from 'vitest';
import {
  initialShorts,
  step,
  type ShortsAction,
  type ShortsConfig,
  type ShortsEvent,
  type ShortsState,
} from './shorts';

const DURATION = 20;
const autoOn: ShortsConfig = { auto: true, pauseSeconds: 1, holdOnHover: true };

function run(state: ShortsState, events: ShortsEvent[]) {
  const actions: ShortsAction[][] = [];
  let current = state;
  for (const event of events) {
    const result = step(current, event);
    current = result.state;
    actions.push(result.actions);
  }
  return { state: current, actions, last: actions[actions.length - 1] ?? [] };
}

const time = (currentTime: number, now: number): ShortsEvent => ({
  type: 'time',
  currentTime,
  duration: DURATION,
  now,
});
const config = (c: Partial<ShortsConfig>, now = 0): ShortsEvent => ({
  type: 'config',
  config: { ...autoOn, ...c },
  now,
});
const hover = (hovered: boolean, now: number): ShortsEvent => ({ type: 'hover', hovered, now });
const started = (now: number): ShortsEvent => ({ type: 'media-started', now });
const active = (isActive: boolean, now: number): ShortsEvent => ({
  type: 'active',
  active: isActive,
  now,
});

// A Short that is playing with auto on and a primed previous sample.
function playing(c: Partial<ShortsConfig> = {}) {
  return run(initialShorts(), [config(c), started(0), time(5, 100)]).state;
}

// Plays to the loop jump at now = 20000.
function atRunComplete(state: ShortsState) {
  return run(state, [time(19.8, 19900), time(0.4, 20000)]);
}

function blockedState() {
  const advancing = atRunComplete(playing({ pauseSeconds: 0 })).state;
  return step(advancing, { type: 'timer', now: 23000 }).state;
}

describe('Shorts state machine', () => {
  it('starts with auto off and does nothing at a run end', () => {
    const state = run(initialShorts(), [started(0), time(5, 100)]).state;
    expect(atRunComplete(state).actions.flat()).toEqual([]);
  });

  it('starts with hold on hover and a one second pause once auto is on', () => {
    const state = run(initialShorts(), [config({}), started(0), time(5, 100)]).state;
    expect(atRunComplete(state).last).toEqual([{ type: 'pause' }, { type: 'schedule', at: 21000 }]);
    expect(step(state, hover(true, 1000)).actions).toEqual([]);
  });

  it('pauses at the loop jump and schedules the advance after the pause', () => {
    expect(atRunComplete(playing()).last).toEqual([
      { type: 'pause' },
      { type: 'schedule', at: 21000 },
    ]);
  });

  it('advances when the pause timer comes and waits for the next Short', () => {
    const { state } = atRunComplete(playing());
    expect(step(state, { type: 'timer', now: 21000 }).actions).toEqual([
      { type: 'advance' },
      { type: 'schedule', at: 24000 },
    ]);
  });

  it('treats an ended event as a completed run', () => {
    const state = run(playing(), [time(19.9, 19900)]).state;
    expect(step(state, { type: 'ended', now: 20000 }).actions).toEqual([
      { type: 'pause' },
      { type: 'schedule', at: 21000 },
    ]);
  });

  it('does not treat a seek in mid-video as a completed run', () => {
    const events = [time(10, 200), time(0.5, 300), time(12, 400), time(19, 500), time(3, 600)];
    expect(run(playing(), events).actions.flat()).toEqual([]);
  });

  it('needs the jump from the end: samples near the end alone complete nothing', () => {
    expect(run(playing(), [time(19.9, 19900), time(19.95, 19950)]).actions.flat()).toEqual([]);
  });

  it('only primes the previous time with the first sample after a new Short', () => {
    const state = run(playing(), [started(500)]).state;
    expect(run(state, [time(0.4, 600)]).actions.flat()).toEqual([]);
  });

  it('never advances with auto off', () => {
    const state = run(initialShorts(), [started(0), time(5, 100)]).state;
    const after = atRunComplete(state);
    expect(after.actions.flat()).toEqual([]);
    expect(step(after.state, { type: 'timer', now: 99999 }).actions).toEqual([]);
  });

  it('keeps looping at the end while hovered', () => {
    const state = run(playing(), [hover(true, 1000)]).state;
    expect(atRunComplete(state).actions.flat()).toEqual([]);
  });

  it('does not advance the moment the cursor leaves, only at the next run end', () => {
    const state = run(playing(), [hover(true, 1000)]).state;
    const held = atRunComplete(state).state;
    expect(step(held, hover(false, 20100)).actions).toEqual([]);
    const left = run(held, [hover(false, 20100), time(19.8, 39900), time(0.4, 40000)]);
    expect(left.last).toEqual([{ type: 'pause' }, { type: 'schedule', at: 41000 }]);
  });

  it('ignores hover at the end when holding on hover is off', () => {
    const state = run(playing({ holdOnHover: false }), [hover(true, 1000)]).state;
    expect(atRunComplete(state).last).toEqual([{ type: 'pause' }, { type: 'schedule', at: 21000 }]);
  });

  it('plays on and cancels the advance when the cursor enters during the pause', () => {
    const { state } = atRunComplete(playing());
    const result = step(state, hover(true, 20500));
    expect(result.actions).toEqual([{ type: 'play' }]);
    expect(step(result.state, { type: 'timer', now: 21000 }).actions).toEqual([]);
  });

  it('keeps the pause when hovering with holding on hover off', () => {
    const { state } = atRunComplete(playing({ holdOnHover: false }));
    expect(step(state, hover(true, 20500)).actions).toEqual([]);
  });

  it('advances at once with a pause of 0 seconds', () => {
    expect(atRunComplete(playing({ pauseSeconds: 0 })).last).toEqual([
      { type: 'advance' },
      { type: 'schedule', at: 23000 },
    ]);
  });

  it('goes back to playing when the next Short starts after the advance', () => {
    const { state } = atRunComplete(playing({ pauseSeconds: 0 }));
    const next = run(state, [started(20200), time(0.1, 20300), time(5, 20400)]);
    expect(next.actions.flat()).toEqual([]);
    expect(atRunComplete(next.state).last).toEqual([
      { type: 'advance' },
      { type: 'schedule', at: 23000 },
    ]);
  });

  it('plays on when no new Short starts within the advance timeout', () => {
    const { state } = atRunComplete(playing({ pauseSeconds: 0 }));
    expect(step(state, { type: 'timer', now: 23000 }).actions).toEqual([{ type: 'play' }]);
  });

  it('does not advance while blocked, even at a run end', () => {
    const events = [time(19.8, 39900), time(0.4, 40000)];
    expect(run(blockedState(), events).actions.flat()).toEqual([]);
  });

  it('advances at the next run end after a user gesture unblocks it', () => {
    const events: ShortsEvent[] = [
      { type: 'gesture', now: 30000 },
      time(19.8, 39900),
      time(0.4, 40000),
    ];
    expect(run(blockedState(), events).last).toEqual([
      { type: 'advance' },
      { type: 'schedule', at: 43000 },
    ]);
  });

  it('goes back to playing when a Short starts while blocked', () => {
    const events = [started(30000), time(0.1, 30100), time(19.8, 49900), time(0.4, 50000)];
    expect(run(blockedState(), events).last).toEqual([
      { type: 'advance' },
      { type: 'schedule', at: 53000 },
    ]);
  });

  it('cancels a pending pause when a Short starts manually', () => {
    const { state } = atRunComplete(playing());
    const result = run(state, [started(20500)]);
    expect(result.last).toEqual([]);
    expect(step(result.state, { type: 'timer', now: 21000 }).actions).toEqual([]);
  });

  it('ignores a timer before the scheduled time', () => {
    const { state } = atRunComplete(playing());
    expect(step(state, { type: 'timer', now: 20999 }).actions).toEqual([]);
  });

  it('ignores a stale timer while playing', () => {
    expect(step(playing(), { type: 'timer', now: 99999 }).actions).toEqual([]);
  });

  it('ignores the pause timer while advancing before its timeout', () => {
    const { state } = atRunComplete(playing());
    const advancing = step(state, { type: 'timer', now: 21000 }).state;
    expect(step(advancing, { type: 'timer', now: 21500 }).actions).toEqual([]);
  });

  it('plays on when auto is turned off during the pause', () => {
    const { state } = atRunComplete(playing());
    const result = step(state, config({ auto: false }, 20500));
    expect(result.actions).toEqual([{ type: 'play' }]);
    expect(step(result.state, { type: 'timer', now: 21000 }).actions).toEqual([]);
  });

  it('does not send play when auto is turned off while blocked', () => {
    expect(step(blockedState(), config({ auto: false }, 24000)).actions).toEqual([]);
  });

  it('advances at the next run end when auto is turned on mid-Short', () => {
    const state = run(initialShorts(), [started(0), time(5, 100), config({}, 200)]).state;
    expect(atRunComplete(state).last).toEqual([{ type: 'pause' }, { type: 'schedule', at: 21000 }]);
  });

  it('keeps the existing schedule when the pause length changes while waiting', () => {
    const { state } = atRunComplete(playing());
    const changed = step(state, config({ pauseSeconds: 5 }, 20500));
    expect(changed.actions).toEqual([]);
    expect(step(changed.state, { type: 'timer', now: 21000 }).actions).toEqual([
      { type: 'advance' },
      { type: 'schedule', at: 24000 },
    ]);
  });

  it('still advances when the video plays on during the pause', () => {
    const { state } = atRunComplete(playing());
    const result = step(state, { type: 'time', currentTime: 0.6, duration: 20, now: 20500 });
    expect(result.actions).toEqual([]);
    expect(step(result.state, { type: 'timer', now: 21000 }).actions).toEqual([
      { type: 'advance' },
      { type: 'schedule', at: 24000 },
    ]);
  });

  it('ignores samples with a duration that is NaN, zero or infinite', () => {
    const bad = [NaN, 0, Infinity].map((duration): ShortsEvent => ({
      type: 'time',
      currentTime: 0.4,
      duration,
      now: 20000,
    }));
    const events = [time(19.8, 19900), ...bad];
    expect(run(playing(), events).actions.flat()).toEqual([]);
    expect(run(playing(), [...events, time(0.4, 20100)]).last).toEqual([
      { type: 'pause' },
      { type: 'schedule', at: 21100 },
    ]);
  });

  it('does not mutate the state it is given', () => {
    const state = playing();
    const snapshot = structuredClone(state);
    atRunComplete(state);
    step(state, hover(true, 1));
    step(state, config({ auto: false }));
    step(state, active(false, 1));
    expect(state).toEqual(snapshot);
  });

  it('completes a run only on a real jump back, also in media under 2 seconds', () => {
    const sample = (currentTime: number, now: number): ShortsEvent => ({
      type: 'time',
      currentTime,
      duration: 1.5,
      now,
    });
    const state = run(initialShorts(), [config({}), started(0), sample(0.2, 100)]).state;
    const result = run(state, [
      sample(0.6, 150),
      sample(0.75, 200),
      sample(1.3, 300),
      sample(0.4, 400),
    ]);
    expect(result.actions.slice(0, 3)).toEqual([[], [], []]);
    expect(result.last).toEqual([{ type: 'pause' }, { type: 'schedule', at: 1400 }]);
  });

  it('forgets the pending pause and sends no action when it becomes inactive while waiting', () => {
    const { state } = atRunComplete(playing());
    const result = step(state, active(false, 20500));
    expect(result.actions).toEqual([]);
    expect(step(result.state, { type: 'timer', now: 21000 }).actions).toEqual([]);
  });

  it('becomes inactive in any phase without actions', () => {
    const advancing = atRunComplete(playing({ pauseSeconds: 0 })).state;
    for (const state of [playing(), advancing, blockedState()]) {
      const result = step(state, active(false, 30000));
      expect(result.actions).toEqual([]);
      expect(result.state.phase).toBe('playing');
      expect(step(result.state, { type: 'timer', now: 99999 }).actions).toEqual([]);
    }
  });

  it('does nothing at a run end while inactive', () => {
    const state = run(playing(), [active(false, 1000)]).state;
    expect(atRunComplete(state).actions.flat()).toEqual([]);
    expect(step(state, { type: 'ended', now: 20000 }).actions).toEqual([]);
  });

  it('does nothing when it becomes active again, the next run end advances', () => {
    const inactive = run(playing(), [active(false, 1000)]).state;
    const result = step(inactive, active(true, 2000));
    expect(result.actions).toEqual([]);
    expect(atRunComplete(result.state).last).toEqual([
      { type: 'pause' },
      { type: 'schedule', at: 21000 },
    ]);
  });

  it('pauses a Short that starts while inactive, once, at its first sample', () => {
    const advancing = atRunComplete(playing({ pauseSeconds: 0 })).state;
    const hidden = step(advancing, active(false, 20100)).state;
    const result = run(hidden, [started(20500), time(0.1, 20600), time(0.3, 20800)]);
    expect(result.actions).toEqual([[], [{ type: 'pause' }], []]);
  });

  it('lets a Short that starts while active play', () => {
    const result = run(playing(), [started(1000), time(0.1, 1100)]);
    expect(result.actions.flat()).toEqual([]);
  });
});
