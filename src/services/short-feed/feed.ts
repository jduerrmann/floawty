// The page script of a short-video feed: runs the auto mode and answers floawty's `__floawty.sync`.
import { startBridge, type Problem, type Status } from '../bridge';
import { createVideoOnly, type VideoOnlyRules } from '../video-only';
import { readInput, type FeedInput } from './input';
import { initialShorts, step, type ShortsAction, type ShortsEvent } from './shorts';

/** What a service tells the feed about its page. */
export interface FeedPage {
  hosts: readonly string[];
  /** Whether the page shows the feed: portrait, auto mode and the problem check. */
  onFeed: () => boolean;
  /** Whether the feed is on the page at all; its absence is a broken selector. */
  feedFound: () => boolean;
  /** The video or music of the item in view, also while paused; none for an item without one. */
  currentMedia: () => HTMLMediaElement | null;
  /** The service's own control that moves to the next item, if the page offers it now. */
  nextControl: () => HTMLElement | null;
  /** Changes with every item of the feed; a change is a new media start. */
  itemKey: () => string;
  /** Events of the current video that start a new item even without a new key. */
  startEvents: readonly string[];
  /** The picture shown of the item's slideshow and how many it has; none without one. */
  slide?: () => { index: number; count: number } | null;
  videoOnly: VideoOnlyRules;
}

const PROBLEM_AFTER_MS = 2000;
// A page that restarts its video this soon after floawty paused it (TikTok does at every end) is paused again.
const RESTART_WINDOW_MS = 500;
const MEDIA_EVENTS = ['timeupdate', 'ended', 'loadstart', 'playing'];
const GESTURE_EVENTS = ['pointerdown', 'keydown'];

export function startShortFeed(page: FeedPage): void {
  startBridge(page.hosts, () => {
    const feed = new ShortFeed(page);
    for (const type of MEDIA_EVENTS) document.addEventListener(type, feed.onMedia, true);
    for (const type of GESTURE_EVENTS) document.addEventListener(type, feed.onGesture, true);
    return feed.sync;
  });
}

function guarded(work: () => void): void {
  try {
    work();
  } catch {
    // A broken selector or page quirk must never reach the page.
  }
}

// A class keeps the feed's state and its many small steps together within the size limits.
class ShortFeed {
  private state = initialShorts();
  private hover = false;
  private active = true;
  private videoOnly = false;
  private problemVerdict = false;
  private seenKey: string;
  private keyChangedAt = Date.now();
  private advanceFoundNoControl = false;
  private timer: number | undefined;
  private readonly applyVideoOnly: (wanted: boolean) => boolean;

  constructor(private readonly page: FeedPage) {
    this.seenKey = page.itemKey();
    this.applyVideoOnly = createVideoOnly(page.videoOnly);
  }

  readonly sync = (raw: unknown): Status => {
    try {
      this.noticeNewItem();
      const input = readInput(raw);
      if (input) this.applyInput(input);
      return this.status();
    } catch {
      return { aspect: 'landscape', problems: [] };
    }
  };

  readonly onMedia = (event: Event): void => {
    guarded(() => {
      this.noticeNewItem();
      const video = this.page.currentMedia();
      if (!this.page.onFeed() || !video || event.target !== video) return;
      const now = Date.now();
      if (this.page.startEvents.includes(event.type)) this.mediaStarted();
      else if (event.type === 'ended') this.feed({ type: 'ended', now });
      else if (event.type === 'timeupdate') {
        const slide = this.page.slide?.();
        if (slide) this.feed({ type: 'slide', ...slide, now });
        this.feed({ type: 'time', currentTime: video.currentTime, duration: video.duration, now });
      }
    });
  };

  readonly onGesture = (event: Event): void => {
    if (!event.isTrusted) return;
    guarded(() => this.feed({ type: 'gesture', now: Date.now() }));
  };

  private feed(event: ShortsEvent): void {
    const result = step(this.state, event);
    this.state = result.state;
    for (const action of result.actions) this.run(action);
  }

  private run(action: ShortsAction): void {
    switch (action.type) {
      case 'pause':
        this.pause();
        return;
      case 'play':
        this.page
          .currentMedia()
          ?.play()
          .catch(() => undefined);
        return;
      case 'advance':
        // After the page's own handlers of the same event, which may restart the old video.
        window.setTimeout(() => guarded(() => this.advance()), 0);
        return;
      case 'schedule':
        this.schedule(action.at);
        return;
    }
  }

  // YouTube plays on when paused during its loop seek, TikTok right after its end; both are paused again.
  private pause(): void {
    const video = this.page.currentMedia();
    if (!video) return;
    // Hover, auto off, inactivity, a swipe or the timer may have left the wait by then.
    const pauseIfStillWaiting = () =>
      guarded(() => {
        if (this.state.phase === 'waiting' || !this.state.active) video.pause();
      });
    if (video.seeking) {
      video.addEventListener('seeked', pauseIfStillWaiting, { once: true });
      return;
    }
    video.pause();
    video.addEventListener('playing', pauseIfStillWaiting, { once: true });
    window.setTimeout(
      () => video.removeEventListener('playing', pauseIfStillWaiting),
      RESTART_WINDOW_MS,
    );
  }

  private advance(): void {
    const control = this.page.nextControl();
    if (control) control.click();
    else this.advanceFoundNoControl = true;
  }

  private schedule(at: number): void {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(
      // A timer can fire a millisecond early; the state machine would then drop it.
      () => guarded(() => this.feed({ type: 'timer', now: Math.max(Date.now(), at) })),
      Math.max(0, at - Date.now()),
    );
  }

  private mediaStarted(): void {
    this.advanceFoundNoControl = false;
    this.feed({ type: 'media-started', now: Date.now() });
  }

  private noticeNewItem(): void {
    const key = this.page.itemKey();
    if (key === this.seenKey) return;
    this.seenKey = key;
    this.keyChangedAt = Date.now();
    this.mediaStarted();
  }

  private applyInput(input: FeedInput): void {
    const now = Date.now();
    const { auto, pauseSeconds, holdOnHover } = this.state.config;
    const changed = input.shorts;
    if (
      auto !== changed.auto ||
      pauseSeconds !== changed.pauseSeconds ||
      holdOnHover !== changed.holdOnHover
    ) {
      this.feed({ type: 'config', config: { ...changed }, now });
    }
    if (this.hover !== input.hover) {
      this.hover = input.hover;
      this.feed({ type: 'hover', hovered: this.hover, now });
    }
    if (this.active !== input.active) {
      this.active = input.active;
      this.feed({ type: 'active', active: this.active, now });
    }
    this.videoOnly = input.videoOnly;
  }

  private status(): Status {
    const portrait = this.page.onFeed();
    const settled = Date.now() - this.keyChangedAt >= PROBLEM_AFTER_MS;
    // Keep the last verdict while the page settles, so the warning does not blink on every item.
    if (!portrait) this.problemVerdict = false;
    else if (settled) {
      this.problemVerdict = !this.page.feedFound() || !this.page.nextControl();
    }
    const problems: Problem[] = [];
    if (portrait && (this.advanceFoundNoControl || this.problemVerdict)) {
      problems.push('controls-missing');
    }
    if (this.applyVideoOnly(this.videoOnly)) problems.push('player-missing');
    return { aspect: portrait ? 'portrait' : 'landscape', problems };
  }
}
