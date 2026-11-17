---
type: tech
area: window
tags: [overlay, settings, hotkeys, logging]
status: active
created: 2026-11-17
updated: 2026-11-17
source: mvp-02 implementation
---

# Overlay window, settings, hotkeys, log

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
- A hotkey another app holds is logged, never fatal.
- Logs stay local ([[core-principles]] #4).

## Structure

| File | Role | Tests |
|---|---|---|
| `geometry.rs` | first placement (bottom right, 480 × 270, 16 px gap, scaled), per-axis snapping within 32 px, 16:9 / 9:16, restore on the monitor with the largest overlap | unit |
| `settings.rs` | `Settings` v1 (opacity, floaty geometry, hotkeys), tolerant `parse`, opacity clamp 10–100 % and 10 % steps | unit |
| `persistence.rs` | `%APPDATA%\floawty\settings.json`, atomic write (temp + rename), keeps broken files | unit (temp dir) |
| `overlay.rs` | place and show, layered-window opacity, click-through, hide/show, settle 250 ms after the last move/resize (snap, aspect, save) | Win32 check script |
| `hotkeys.rs` | registers the hotkeys from the settings (default Ctrl+Alt+Shift + O / D / ↑ / ↓) | manual |
| `logbook.rs` | `%APPDATA%\floawty\logs\floawty.log`, UTC timestamps | unit |
| `src/click-through.ts`, `src/i18n.ts` | corner dot and 4 s hint, EN/DE texts | Vitest (i18n) |

Settings file (v1):

```json
{
  "version": 1,
  "opacity": 0.8,
  "floaty": { "x": 16, "y": 16, "width": 624, "height": 351 },
  "hotkeys": {
    "toggleVisible": "Ctrl+Alt+Shift+O",
    "clickThrough": "Ctrl+Alt+Shift+D",
    "opacityUp": "Ctrl+Alt+Shift+Up",
    "opacityDown": "Ctrl+Alt+Shift+Down"
  }
}
```

Commands for the UI: `overlay_state`, `set_opacity`, `webview_version`; event
`overlay-state` on every change.

## Working on X → read Y

- New setting → `settings.rs` (default + parse test), then this note's example.
- Window behaviour → `geometry.rs` tests first, then `overlay.rs`.
- Changing the stored format → bump `CURRENT_VERSION` and add a migration test.
