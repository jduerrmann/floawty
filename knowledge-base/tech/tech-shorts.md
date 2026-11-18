---
type: tech
area: shorts
tags: [shorts, youtube, page-script]
status: active
created: 2026-11-17
updated: 2026-11-17
source: mvp-06 implementation
---

# YouTube Shorts auto mode and page scripts

A page script inside youtube.com moves on after each Short; the Rust shell asks it for
its status and turns the overlay. Decision: [[page-scripts-polled-on-title-change]].

## Invariants

- **Service pages never call floawty.** The page script defines
  `window.__floawty.sync(input)` (not writable, frozen); Rust calls it with
  `eval_with_callback` and parses the answer as untrusted data (≤ 128 chars, closed
  enums, unknown fields rejected, fixed log text).
- Rust asks only when woken: title change (title discarded), page load finished,
  `set_preferences`, hover edge, and once 3 s after each wake for the problem check.
  Answers from an earlier page are dropped (generation); answers are applied on the
  main thread, like settling and mode changes, so turning never interleaves with them.
- The input carries `active` = window visible and settings closed; inactive stops the
  automatic without playing (floawty paused the video). Hiding and the settings sync.
  A Short that starts while inactive (an advance sent just before hiding) is paused
  at its first sample.
- The problem is logged once per opened service; the dot only changes with the verdict,
  which the page keeps while a new Short settles (2 s).
- The script is `page/<id>.js` from floawty's own build, chosen by a validated id
  (`[a-z0-9-]`, ≤ 32). The asset resolver falls back to `index.html` for missing
  files, so text starting with `<` is rejected.
- The script runs in every frame and on every allowed domain; it returns at once
  unless it is the top frame on a youtube.com host. It never imports `@tauri-apps`.
- A Short's end is its jump from the last second back to the first (`loop=true`,
  `ended` never fires) or `ended`. Ads play in the same video and get no special
  treatment: they run once in full, never shortened ([[core-principles]] #7).
- Moving on clicks `#navigation-button-down button` – the user's own control; never
  keys, URLs, likes or skips.
- Hover = the cursor anywhere over floawty (`Sample.inside`), false in click-through,
  while the settings are open or the window is hidden.

## Flow

playing → run complete → waiting (video paused on its first frame, pause from the
settings) → advancing (click) → new media → playing. Hover at the end keeps looping;
hover during the pause plays on. YouTube calls `play()` at every loop, so a pause
during the loop seek is undone at once: the pause waits for `seeked` (live-checked).
Playing on during the pause never cancels the advance. No new media within 3 s → blocked (YouTube ignores
scripted clicks before the user's first real click); the user's next click or key in
the page unblocks, the next end advances.

## Structure

| File | Role | Tests |
|---|---|---|
| `src/services/youtube/shorts.ts` | pure state machine `step(state, event) → actions` | Vitest |
| `src/services/youtube/page.ts`, `selectors.ts` | DOM wiring, `__floawty.sync`, aspect from `/shorts/`, problem after 2 s | Playwright adapter (Edge) |
| `src-tauri/src/page.rs` | script lookup, reset per service, wake, hover, sync, parse | unit |
| `src-tauri/src/service.rs` | init script, title and page-load wake-ups | Playwright (`tests/shorts.spec.ts`, fixtures on routed youtube.com) |
| `src-tauri/src/overlay.rs`, `geometry.rs`, `mode.rs` | turning the floaty view ([[tech-window]]) | unit |

Status: `{ aspect: "portrait" | "landscape", problem: null | "controls-missing" }`.
Input: `{ shorts: { auto, pauseSeconds, holdOnHover }, hover, active }`. On other
hosts the top frame gets a frozen no-op bridge, so a page cannot catch the input.

## Known gaps

- Selectors are checked live on 2026-11-17 only; ads were seen without sign-in.
