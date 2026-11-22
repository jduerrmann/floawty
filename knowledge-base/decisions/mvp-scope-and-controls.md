---
type: decision
area: ui
tags: [mvp, scope, overlay, hotkeys, tiles]
status: active
created: 2026-11-17
updated: 2026-11-22
source: visual plan "MVP-Planung", rounds 1–2 (`.claude/plans/mvp-planung.md`)
---

# The MVP is the full overlay, Shorts auto mode and "video only"

Supersedes the hotkey and bar-placement parts of [[overlay-controls]]; everything else
there still applies.

## Context

On Tauri/WebView2 every service already plays as a normal web page
([[stack-spike-results]]), so a separate phase for DRM services is not needed. The
maintainer wants to use floawty daily as soon as the MVP is done.

## Decision

- **Scope:** overlay window, all service tiles, YouTube Shorts auto mode and the
  "video only" view. Order: overlay and tiles → Shorts → "video only" (YouTube and
  Netflix first). The old phase 4 is dropped.
- **Hover bar** lies over the video (transparent webview on top of the service).
- **App tiles** with the services' official logos ([[bundled-service-logos]], since
  2026-11-17 own SVG symbols: [[own-service-symbols]], since 2026-11-21 redrawn
  logos: [[redrawn-service-logos]]); a
  custom URL can be saved as its own tile.
- **First start:** a cookie-banner-like notice above the tiles (now over them,
  [[first-start-notice-over-tiles]]) about WebView2
  ([[webview2-diagnostics-disclosed]]), one OK.
- **Window mode ↔ floaty view:** a ⧉ button in the bar and a hotkey. Window mode is a
  normal window (frame, not always on top, fully opaque) for signing in and
  browsing; floaty view is the overlay. Each mode remembers its own size and place.
- **Click-through indicator:** a small dot in a corner; when switched on, it first
  shows how to leave click-through.
- **Hotkeys** default to Ctrl+Alt+Shift (+O show/hide, +D click-through, +↑/↓
  opacity, +Space pause, +F window mode) and can be changed in the settings.
- **Settings** open inside the overlay; the video pauses meanwhile.
- **Tech:** Vite + TypeScript without a UI framework, window logic (geometry,
  snapping, settings) in Rust with unit tests, npm; snapping to corners and edges
  with a 16 px margin.

## Alternatives

- Overlay and tiles only, Shorts and "video only" later – rejected: the maintainer
  wants the special features in daily use.
- Bar as its own strip above the video – fallback if the transparent bar webview
  causes problems.
- Ctrl+Shift hotkeys – rejected: they take shortcuts away from browsers.
- "Bigger for setup" button instead of a real window mode – rejected: floawty should
  also work as a normal window.

## Consequences

- Risk: "video only" depends on each site's DOM. Selectors live in one file per
  service, fixtures test them, and a broken rule falls back to the normal page
  (AGENTS.md rule 7).
- Plan: [[plan-mvp]].
