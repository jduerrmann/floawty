---
type: decision
area: ui
tags: [bar, window-mode, sign-in]
status: active
created: 2026-11-18
updated: 2026-11-18
source: visual plan "mvp-08 Messen und Prüfen", round 2, approved 2026-11-18
---

# The bar leaves the page clickable: above it in window mode, narrow in the floaty view

## Context

The mvp-08 service checks found that Twitch and Apple TV could not be signed in to:
their sign-in buttons sit in the top 40 px, where the bar, a transparent webview
across the full width, appears on hover and swallows every click, also in window mode.

## Decision

- Window mode: the bar is a pinned strip above the page; the service starts below it.
- Floaty view over a service: the bar webview is only as wide as its controls,
  centred, so the page left and right of it stays clickable (maintainer's addition).
- On the tiles, in the settings and with click-through on, the bar keeps the full width.
- A grip ⠿ at the left of the controls moves the window, since the empty strip that used
  to drag it is gone (independent review).

## Alternatives

- Bar at the bottom – rejected: it would cover the players' progress bar and controls.
- A small corner button instead of the bar – rejected: a large rework, harder to hit.

## Consequences

The bar page reports its controls' natural width (`set_bar_width`); the shell places
bar and service ([[tech-bar-and-settings]]). In the floaty view the centre of the top
strip is still covered while the bar shows.
