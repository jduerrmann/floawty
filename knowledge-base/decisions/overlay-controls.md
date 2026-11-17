---
type: decision
area: ui
tags: [overlay, controls, hotkeys, shorts]
status: active
created: 2026-11-17
updated: 2026-11-17
source: conversation (visual plan "floawty – Projektplanung", rounds 1–2)
---

# The overlay is controlled by a hover bar and hotkeys

## Context

The overlay must stay small and out of the way, yet size, opacity, service and
click-through need quick access. Planning page `.claude/plans/projektplanung.md`.

## Decision

- **Hover bar** appears after 300 ms over the overlay: switch service, opacity
  slider, click-through on, Shorts auto mode on/off, settings, close.
- **Service picker** is a tile view inside the overlay, no second window.
- **Settings** is a small panel: language, hotkey overview, Shorts pause, update check,
  delete all data.
- **Hotkeys** use Ctrl+Shift as base and are fixed in the MVP: Ctrl+Shift+O show/hide,
  Ctrl+Shift+↑/↓ opacity, Ctrl+Shift+D click-through, Ctrl+Shift+Space play/pause.
- **Click-through** is left only via its hotkey.
- **Hiding** the overlay pauses the video.
- **Shorts auto mode** moves on after the first full run, with a short configurable
  pause (default 1 s).
- Defaults: one overlay at a time; first start bottom right, 480 × 270, fully opaque;
  starts with the last used service; resizing keeps the aspect ratio (16:9, 9:16 in
  Shorts).

## Alternatives

- Tray icon menu – rejected for now: far from the video. Can be added later.
- Hotkeys only – rejected: not discoverable.
- Ctrl+Alt hotkeys – rejected: collide with AltGr and screen-rotation shortcuts.
- Hold Ctrl or a corner grip to leave click-through – deferred until the hotkey proves
  annoying in daily use.
- Keep playing when hidden – rejected: wastes resources, the user misses content.

## Consequences

- The hover bar overlays the service page; it must not break the page or catch clicks
  while hidden.
- Configurable hotkeys need a later decision and a settings field.
