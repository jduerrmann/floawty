---
type: tech
area: shorts
tags: [shorts, youtube, tiktok, page-script]
status: active
created: 2026-11-17
updated: 2026-11-21
source: mvp-06 implementation
---

# Auto mode for short feeds (YouTube Shorts, TikTok) and page scripts

A page script inside the service moves on after each short video; the Rust shell asks it
for its status and turns the overlay. Decisions: [[page-scripts-polled-on-title-change]],
[[tiktok-as-short-feed]].

## Invariants

- **Service pages never call floawty.** The page script defines
  `window.__floawty.sync(input)` (not writable, frozen); Rust calls it with
  `eval_with_callback` and parses the answer as untrusted data (≤ 128 chars, closed
  enums, unknown fields rejected, fixed log text).
- Rust asks only when woken: title change (title discarded), page load finished,
  `set_preferences`, hover edge, and once 3 s after each wake for the problem check.
  Answers from an earlier page are dropped (generation); answers are applied on the
  main thread, like settling and mode changes, so turning never interleaves with them.
  TikTok changes neither title nor path per item, so its problems surface at the next
  wake (a hover edge, preferences, a page load); the auto mode itself needs no wake.
- The input carries `active` = window visible and settings closed; inactive stops the
  automatic without playing (floawty paused the video). Hiding and the settings sync.
  A Short that starts while inactive (an advance sent just before hiding) is paused
  at its first sample.
- Each problem kind is logged once per opened service; the dot only changes with the verdict,
  which the page keeps while a new Short settles (2 s).
- The script is `page/<id>.js` from floawty's own build, chosen by a validated id
  (`[a-z0-9-]`, ≤ 32). The asset resolver falls back to `index.html` for missing
  files, so text starting with `<` is rejected.
- The script runs in every frame and on every allowed domain; it returns at once
  unless it is the top frame on one of the adapter's hosts. It never imports `@tauri-apps`.
- A video's end is its jump from the last second back to the first (YouTube: `loop=true`,
  `ended` never fires) or `ended` (TikTok: `loop=false`; it seeks to 0.1 and plays within
  ~3 ms, so a pause is repeated when the video plays again within 500 ms). Ads play in the same video and get no special
  treatment: they run once in full, never shortened ([[core-principles]] #7).
- Moving on clicks the user's own control – YouTube `#navigation-button-down button`,
  TikTok `[data-e2e="feed-navigation-next"]`; never keys, URLs, likes or skips.
- A new item is a new key of the adapter (YouTube: the path; TikTok: the id of the
  article across the middle of the window, since the path stays `/foryou`) or one of its
  start events (YouTube: `loadstart`; TikTok none – it preloads the next video). On
  TikTok the current medium is, for a photo series (an article with a slideshow), its music
  `audio` (13–60 s seen; it pauses, ends and restarts like a video, live 2026-11-21), else
  the article's `video`; a parked video in a photo item never counts. A LIVE item is
  assumed to have none (not seen yet), so nothing ends and nothing is played.
- A photo series also ends after one round of its slideshow: Swiper in loop mode (pictures
  copied, `data-swiper-slide-index` 0…n−1, active `.swiper-slide-active`, 2.5–4 s each,
  live 2026-11-21). The adapter's optional `slide()` (photo series only) is sampled at each
  `timeupdate` of the music; once every picture was seen, the next change completes the
  run, counted from whichever picture came first; a round held by the mouse starts a new
  one. Whichever comes first, the round or the music's end, moves on. The click to move on goes out one task after the
  event, after the page's own handlers of it. Missing controls mean no feed (YouTube: no
  Short video; TikTok: no article in the middle) or no next control.
- Hover = the cursor anywhere over floawty (`Sample.inside`), false in click-through,
  while the settings are open or the window is hidden.
- Under video only the Shorts list fills the window ([[tech-video-only]]), so the wheel
  and swipes reach YouTube's own list and page as on YouTube; floawty adds no wheel code.

## Flow

playing → run complete → waiting (video paused on its first frame, pause from the
settings) → advancing (click) → new media → playing. Hover at the end keeps looping;
hover during the pause plays on. YouTube calls `play()` at every loop, so a pause
during the loop seek is undone at once: the pause waits for `seeked` (live-checked).
Playing on during the pause never cancels the advance. No new media within 3 s → blocked (YouTube ignores
scripted clicks before the user's first real click); the user's next click or key in
the page unblocks, the next end advances. In the release app on 2026-11-20 the page was
activated from the start and the scripted click paged, so the blocked phase is a fallback.

## Structure

| File | Role | Tests |
|---|---|---|
| `src/services/short-feed/shorts.ts` | pure state machine `step(state, event) → actions` | Vitest |
| `src/services/short-feed/feed.ts`, `input.ts` | DOM wiring of the auto mode, `__floawty.sync`, problem after 2 s, video only; reads the input as untrusted | Playwright adapter (both services) |
| `src/services/tiktok/` | manifest (`/foryou`, own symbol, `startsShortsAuto`), selectors, page: feed pages `/`, `/foryou`, `/following` | Vitest, `tests/adapters/tiktok.spec.ts` |
| `src/services/youtube-shorts/` | the Shorts tile: YouTube manifest with `/shorts` start, own symbol, `startsShortsAuto`; its `page.ts` imports the YouTube script | Vitest, Playwright |
| `src/services/youtube/page.ts`, `selectors.ts` | the YouTube adapter of the feed: `/shorts/` pages, video only | Playwright adapter (Edge) |
| `src-tauri/src/page.rs` | script lookup, reset per service, wake, hover, sync, parse | unit |
| `src-tauri/src/service.rs` | init script, title and page-load wake-ups | Playwright (`tests/shorts.spec.ts`, fixtures on routed youtube.com) |
| `src-tauri/src/overlay.rs`, `geometry.rs`, `mode.rs` | turning the floaty view ([[tech-window]]) | unit |

Status: `{ aspect: "portrait" | "landscape", problems: ("controls-missing" | "player-missing")[] }`.
Input: `{ shorts: { auto, pauseSeconds, holdOnHover }, hover, active, videoOnly }` ([[tech-video-only]]). On other
hosts the top frame gets a frozen no-op bridge, so a page cannot catch the input.

## Known gaps

- TikTok without an account: its sign-in dialog opens within seconds and, while open,
  TikTok ignores the next control; the auto mode then waits in `blocked` until the user's
  next click (live 2026-11-20). floawty never closes the dialog.
- TikTok's single video pages (`/@user/video/…`) are no feed pages yet (sf-03).
- TikTok hides its up/down arrows in narrow and some landscape windows (`display: none`);
  a click on the hidden arrow still pages (live 2026-11-21, browser shown), so presence
  counts. Live checks in the built-in browser hold only while it is shown: hidden, smooth
  scrolling and TikTok's reaction to a click stall.
- LIVE items have no end: the auto mode stays until the user scrolls. A photo series whose
  music is shorter than one round of its pictures moves on before the last pictures; one
  whose music does not play is never sampled and stays.
- The play/pause hotkey and hiding pause a slideshow's music too, but the hotkey plays only
  videos again: on a photo series the second press does nothing (an `<audio>` has no box
  to tell the item in view from its neighbours).
- Selectors are checked live on 2026-11-17, the Shorts list on 2026-11-20; ads were seen
  without sign-in.
