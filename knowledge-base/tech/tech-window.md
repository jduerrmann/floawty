---
type: tech
area: window
tags: [overlay, settings, hotkeys, logging]
status: active
created: 2026-11-17
updated: 2026-11-22
source: mvp-02 implementation, mvp-05
---

# Main window (floaty view and window mode), settings, hotkeys, log

The Rust shell in `src-tauri/src/` owns the window. Pure logic is unit-tested; the
wiring talks to Tauri and Win32.

## Invariants

- Geometry always means the **visible client area** in physical pixels; Windows adds
  invisible resize borders around a frameless window, so positions are corrected by
  `inner_position - outer_position` before `set_position`.
- Opacity is applied **after** `show()`: showing resets the layered style. Same after
  every window-flag change (click-through, always on top), which rewrites the extended style.
- A broken settings file is copied to `settings.json.broken` before defaults are used
  (AGENTS.md rule 5: settings are never disposable).
- A hotkey another app holds is logged, never fatal; changing one keeps the old one
  if the new one is taken ([[tech-bar-and-settings]]).
- The main window is created in `setup` (`create: false` in `tauri.conf.json`), after
  a requested reset has wiped the profile.
- **Floaty view** = frameless, always on top unless switched off (`alwaysOnTop`; click-through
  keeps it on top while on, `mode::stays_on_top`), stored opacity, click-through allowed,
  snapping, any landscape shape with magnets at 16:9 and 12:5. **Window mode** = title bar, not on top, fully opaque,
  click-through off and ignored, no snapping. Each mode keeps its own geometry
  ([[mvp-scope-and-controls]]).
- **Turning:** while the service page reports a Short ([[tech-shorts]]) the floaty
  view turns 9:16 (`overlay::set_aspect`, runtime only, starts landscape); window mode
  never turns but turns on entering the floaty view. `geometry::turn` keeps a snapped
  edge per axis, else the centre, pulls inside the work area, keeps the 240 px
  minimum width and shrinks to fit. Turning back restores the exact pre-turn
  landscape size unless the user resized the upright view; a move only shifts it.
  The smallest overlay (240 × 135) turns to 240 × 427.
  Size: `rotated` turns any landscape shape into a true 9:16 that keeps its long side
  (back: the swapped sides), `separate` uses `floaty` / `floatyPortrait`
  (`mode::floaty_size`). While portrait, `floaty` stores the landscape equivalent so a
  restart opens landscape in place (`mode::remember_turned`).
- **Show/hide** (Ctrl+Alt+Shift+O, `mode::show_hide_step`): a floaty view that is not on
  top and not the foreground window (nor a dialog it owns) comes to the front instead of
  hiding, restored first if minimized (`unminimize`, `set_focus`);
  otherwise it hides (pausing the video) or shows. Switching always on top off takes
  effect when another window is activated (`HWND_NOTOPMOST`); a covered floawty stays
  in the taskbar and Alt+Tab ([[always-on-top-switch]]).
- Logs stay local ([[core-principles]] #4).

## Structure

| File | Role | Tests |
|---|---|---|
| `geometry.rs` | first placement (floaty: flush bottom right, 480 × 270; window: centred 1280 × 720 or smaller to fit with 16 px room; scaled), per-axis snapping flush within 32 px ([[overlay-snaps-flush]]), landscape shape free with magnets at 16:9 and 12:5 within 4 % (`fit_landscape`, never below the minimum height), 9:16 while a Short plays (`fit_resized`); a height-only drag keeps its height, anything else the width ([[overlay-shape-free-with-zoom]]), restore on the monitor with the largest overlap | unit |
| `settings.rs` | `Settings` v1 (opacity, geometry, hotkeys, tiles, language, animations, Shorts, update check, graphics acceleration, video only, zoom, always on top), tolerant `parse` (unknown language → system), Shorts pause 0–10 s | unit |
| `opacity.rs` | opacity clamp 10–100 %, 10 % steps | unit |
| `persistence.rs` | `%APPDATA%\floawty\settings.json`, atomic write (temp + rename), keeps broken files | unit (temp dir) |
| `mode.rs` | `Mode` (floaty / window), switch and remember geometry per mode | unit |
| `overlay.rs` | place and show in the saved mode, mode style (decorations, on top), layered-window opacity, click-through, hide/show, settle 250 ms after the last move/resize, not before the mouse button is up (floaty: aspect, back onto the work area, snap; both: save) | Win32 check scripts |
| `hotkeys.rs` | registers the hotkeys from the settings (default Ctrl+Alt+Shift + O / D / ↑ / ↓ / F / Space / V / Z / T), changes one at once, pauses all while recording | unit, check scripts |
| `logbook.rs` | `%APPDATA%\floawty\logs\floawty.log`, UTC timestamps | unit |
| `bar.rs`, `hover.rs`, `reset.rs` | the bar over the service, hover, reset all data | [[tech-bar-and-settings]] |

Settings file (v1):

```json
{
  "version": 1,
  "opacity": 0.8,
  "mode": "floaty",
  "floaty": { "x": 16, "y": 16, "width": 624, "height": 351 },
  "window": { "x": 208, "y": 181, "width": 984, "height": 561 },
  "hotkeys": {
    "toggleVisible": "Ctrl+Alt+Shift+O",
    "clickThrough": "Ctrl+Alt+Shift+D",
    "opacityUp": "Ctrl+Alt+Shift+Up",
    "opacityDown": "Ctrl+Alt+Shift+Down",
    "windowMode": "Ctrl+Alt+Shift+F",
    "playPause": "Ctrl+Alt+Shift+Space",
    "videoOnly": "Ctrl+Alt+Shift+V",
    "zoom": "Ctrl+Alt+Shift+Z",
    "alwaysOnTop": "Ctrl+Alt+Shift+T"
  },
  "noticeAccepted": true,
  "customTiles": [],
  "lastService": null,
  "language": "system",
  "theme": "system",
  "animations": true,
  "floatyPortrait": null,
  "shorts": { "auto": false, "pauseSeconds": 1, "holdOnHover": true, "portraitSize": "rotated" },
  "updateCheck": false,
  "videoOnly": false,
  "zoom": false,
  "graphicsAcceleration": true,
  "alwaysOnTop": true
}
```

Commands for the UI: `overlay_state`, `set_opacity`, `toggle_mode`, `toggle_always_on_top`, `webview_version`,
plus the bar and settings commands ([[tech-bar-and-settings]]); event `overlay-state`
on every change.

## Working on X → read Y

- New setting → `settings.rs` (default + parse test), then this note's example.
- Window behaviour → `geometry.rs` tests first, then `overlay.rs`.
- Changing the stored format → bump `CURRENT_VERSION` and add a migration test.
