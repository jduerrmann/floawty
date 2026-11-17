---
type: plan
tags: [package, mvp, window]
status: done
created: 2026-11-17
updated: 2026-11-17
source: conversation
---

# mvp-02 – Overlay window

Plan: [[plan-mvp]] · Current state: [[tech-window]]

## Outcome

The floaty view behaves as decided: frameless, always on top, snapping, kept aspect
ratio, opacity, click-through with a corner dot, remembered geometry, hide/show.

## Acceptance criteria

- [x] First start: bottom right of the primary work area, 480 × 270, fully opaque.
- [x] Drag snaps to corners and edges within 32 px to a 16 px gap; scaling and monitors
      left of the primary covered by unit tests. **Not checked on a real second
      monitor or a scaled display.**
- [x] Resizing keeps 16:9. 9:16 exists in `geometry.rs`, used once Shorts report their
      format (mvp-06).
- [x] Opacity 10–100 % via `set_opacity` and hotkeys, 10 % steps, saved.
- [x] Click-through via hotkey; corner dot while on, hint for 4 s (EN/DE).
- [x] Hide/show via hotkey. **Pausing the video moves to mvp-04** (no service
      webview yet).
- [x] `%APPDATA%\floawty\settings.json`, versioned, tolerant parse, broken file kept,
      geometry restored (also when a monitor is gone – unit test).
- [x] Default hotkeys Ctrl+Alt+Shift + O / D / ↑ / ↓; a taken hotkey is logged.
      **+Space moves to mvp-04, +F to mvp-03.**

## Evidence (2026-11-17)

- Tests first: 11 geometry, 7 settings, 4 persistence, 3 i18n tests red on their
  assertions, then green. `npm run verify` green; exe 3.09 MiB.
- Win32 check script against the release build: first placement 2944,1106 480×270 on a
  3440×1392 work area; snapped to 16,16; resize to 16:9; Ctrl+Alt+Shift+↓ twice →
  alpha 204 and `opacity: 0.8` saved; click-through sets `WS_EX_TRANSPARENT`; hide/show;
  restart restores 16,16 624×351 with alpha 204.
- Found and fixed by that check: window grew by the invisible border on every restart
  (outer vs. inner size); opacity was lost because `show()` resets the layered style.
- UI over CDP: dot and German hint appear with the hotkey, hint gone after 4 s.
- Added deps: tauri-plugin-global-shortcut (approved), windows-sys, serde, serde_json
  (already in the tree through Tauri).
- Follow-up for mvp-05: show hotkeys localized (Strg+Alt+Umschalt in German).

## Resume here

Done. Next: [[mvp-03-window-mode]].
