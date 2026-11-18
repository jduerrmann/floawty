---
type: decision
area: window
tags: [snapping, geometry]
status: active
created: 2026-11-18
updated: 2026-11-18
source: maintainer request during the mvp-08 checks, 2026-11-18
---

# The overlay snaps flush to corners and edges

Amends [[mvp-scope-and-controls]] ("snapping … with a 16 px margin").

## Context

With a 16 px margin the overlay could never sit right in a corner; the maintainer
wanted it flush.

## Decision

- Snapping, the first placement and turning for Shorts use no gap: the overlay sits on
  the edge of the work area (`geometry::SNAP_GAP` = 0). The snap reach stays 32 px.
- A first window-mode window keeps 16 px to the screen edges (`WINDOW_MARGIN`).

## Alternatives

- A setting for the margin – rejected: an option nobody asked for.

## Consequences

A saved geometry within 32 px of an edge snaps flush at its next settle, also right after
the start. After a resize the overlay is moved back onto the work area; a plain move may
still leave it hanging over an edge or across two monitors. Windows' invisible resize
border of a flush overlay lies over the neighbouring edge (e.g. the taskbar's top pixels).
