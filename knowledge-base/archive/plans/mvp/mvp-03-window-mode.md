---
type: plan
tags: [package, mvp, window]
status: done
created: 2026-11-17
updated: 2026-11-17
source: conversation
---

# mvp-03 – Window mode ↔ floaty view

Plan: [[plan-mvp]] · Current state: [[tech-window]]

## Outcome

One action switches between a normal window and the floaty overlay; each mode keeps
its own size and place.

## Acceptance criteria

- [x] Window mode: title bar (31 px), not always on top, fully opaque, click-through
      switched off and ignored, normal resizing without snapping.
- [x] Floaty view: frameless, on top, stored opacity (90 % kept across switches).
- [x] Each mode restores its own geometry; first window mode centred at 1280 × 720,
      smaller on small screens (unit test 1366 × 728 → 1237 × 696).
- [x] Hotkey Ctrl+Alt+Shift+F and command `toggle_mode` (for the bar in mvp-05). The
      main webview is not reloaded, so a playing video keeps playing – to be seen
      with a real service in mvp-04.
- [x] floawty starts in the mode it was closed in.

## Evidence (2026-11-17)

- Tests first: 4 mode tests and 2 window-placement tests red on their assertions,
  then green (32 Rust tests total). Old settings without `mode` load as floaty.
- `npm run verify` green.
- Win32 check script on the release build (3440 × 1392 work area): floaty 480 × 270
  bottom right, title bar 1 px, topmost, alpha 230 after one opacity step; F →
  1080,336 1280 × 720, title bar 31 px, not topmost, click-through off, opaque; moved
  to 984 × 561 without snapping; F → floaty back at its place with alpha 230; F →
  window back at 984 × 561; restart starts in window mode at that place.
- Not checked: a second monitor, a scaled display.

## Resume here

Done. Next: [[mvp-04-tiles-and-first-start]].
