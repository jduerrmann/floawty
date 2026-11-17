---
type: plan
tags: [package, mvp, window]
status: planned
created: 2026-11-17
updated: 2026-11-17
source: conversation
---

# mvp-02 – Overlay window

Plan: [[plan-mvp]]

## Outcome

The floaty view behaves as decided: frameless, always on top, resizable with kept
aspect ratio, snapping, opacity, click-through with a corner dot, remembered
geometry, hiding pauses the video.

## Scope

- Owns: `src-tauri/src/window/` (geometry, snapping, opacity, click-through),
  `src-tauri/src/settings/` (JSON file, defaults, migration), the dot indicator in
  `src/`.
- Non-goals: window mode (03), tiles (04), bar (05).
- Read first: [[mvp-scope-and-controls]], [[overlay-controls]] (defaults),
  `spike/sp-03-tauri` `overlay.rs` (layered window opacity, async webview creation).

## Acceptance criteria

- [ ] First start: bottom right of the primary work area, 480 × 270, fully opaque.
- [ ] Drag snaps to corners and edges within 16 px; works on every monitor and with
      display scaling.
- [ ] Resizing keeps 16:9 (9:16 when the service reports Shorts).
- [ ] Opacity 10–100 % via a command (bar comes in 05) and hotkeys.
- [ ] Click-through on/off via hotkey; corner dot visible while on, with a hint how
      to leave it for the first seconds.
- [ ] Hide/show via hotkey; hiding pauses video in the service webview.
- [ ] Settings file `%APPDATA%\floawty\settings.json`, human-readable, versioned,
      with migration; geometry restored on start, also if a monitor is gone.
- [ ] Default hotkeys Ctrl+Alt+Shift (+O, +D, +↑/↓, +Space, +F); a hotkey that is
      taken is logged, not fatal.

## Tests first

- Rust unit tests: snapping, aspect ratio, restore on a missing monitor, opacity
  clamping, settings defaults and migration from an older version.

## Checks

- `npm run verify`; manual: Netflix stays visible at 50 % and in click-through.

## Resume here

Not started.
