---
type: tech
area: window
tags: [overlay, settings, hotkeys, logging]
status: active
created: 2026-11-17
updated: 2026-11-17
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
  toggling click-through.
- A broken settings file is copied to `settings.json.broken` before defaults are used
  (AGENTS.md rule 5: settings are never disposable).
- A hotkey another app holds is logged, never fatal; changing one keeps the old one
  if the new one is taken ([[tech-bar-and-settings]]).
- The main window is created in `setup` (`create: false` in `tauri.conf.json`), after
  a requested reset has wiped the profile.
- **Floaty view** = frameless, always on top, stored opacity, click-through allowed,
  snapping and 16:9. **Window mode** = title bar, not on top, fully opaque,
  click-through off and ignored, no snapping. Each mode keeps its own geometry
  ([[mvp-scope-and-controls]]).
- Logs stay local ([[core-principles]] #4).

## Structure

| File | Role | Tests |
|---|---|---|
| `geometry.rs` | first placement (floaty: bottom right, 480 × 270, 16 px gap; window: centred 1280 × 720 or smaller to fit; scaled), per-axis snapping within 32 px, 16:9 / 9:16, restore on the monitor with the largest overlap | unit |
| `settings.rs` | `Settings` v1 (opacity, geometry, hotkeys, tiles, language, Shorts, update check), tolerant `parse` (unknown language → system), opacity clamp 10–100 % and 10 % steps, Shorts pause 0–10 s | unit |
| `persistence.rs` | `%APPDATA%\floawty\settings.json`, atomic write (temp + rename), keeps broken files | unit (temp dir) |
| `mode.rs` | `Mode` (floaty / window), switch and remember geometry per mode | unit |
| `overlay.rs` | place and show in the saved mode, mode style (decorations, on top), layered-window opacity, click-through, hide/show, settle 250 ms after the last move/resize (floaty: snap, aspect; both: save) | Win32 check scripts |
| `hotkeys.rs` | registers the hotkeys from the settings (default Ctrl+Alt+Shift + O / D / ↑ / ↓ / F / Space), changes one at once, pauses all while recording | unit, check scripts |
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
    "playPause": "Ctrl+Alt+Shift+Space"
  },
  "noticeAccepted": true,
  "customTiles": [],
  "lastService": null,
  "language": "system",
  "shorts": { "auto": false, "pauseSeconds": 1 },
  "updateCheck": false
}
```

Commands for the UI: `overlay_state`, `set_opacity`, `toggle_mode`, `webview_version`,
plus the bar and settings commands ([[tech-bar-and-settings]]); event `overlay-state`
on every change.

## Working on X → read Y

- New setting → `settings.rs` (default + parse test), then this note's example.
- Window behaviour → `geometry.rs` tests first, then `overlay.rs`.
- Changing the stored format → bump `CURRENT_VERSION` and add a migration test.
