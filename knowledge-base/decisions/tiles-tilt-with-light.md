---
type: decision
area: ui
tags: [tiles, hover, motion, resources]
status: active
created: 2026-11-22
updated: 2026-11-22
source: visual plan "Hell/Dunkel und Hover-Effekt", rounds 1–3, 2026-11-22
---

# Tiles tilt towards the pointer under a moving light

## Context
The 3 % growth on hover felt flat and pushed edge tiles out of the scroll area.

## Decision
- The maintainer's mix: a light and bright rim that follow the pointer, a glow in the
  service colour, a gentle 7° tilt and a floating logo, all fading softly.
- The face tilts inside a still button, pushed back just far enough that no corner
  leaves the tile's box: no scrollbar, no lost hover or click at an edge. The ⋯
  button of an own tile moves with the face.
- Keyboard focus glows without motion; reduced motion keeps only the glow.
- Work happens only on pointer moves: no loop, no `backdrop-filter`.

## Alternatives
- Glow rim, sheen sweep, strong 14° tilt – not chosen.
- A lean version (no fade, still logo) – saves a few MB; the maintainer chose the
  full one and decides again on the app's measurement.

## Consequences
- Real WebView2 (probe, 480 × 270): nothing before the first hover, afterwards
  +16 MB over the old 3 % hover, which itself already kept about 35 MB; ±0 in a large
  window. The memory also stays while watching. The idle budget is measured before
  any hover; the app's measurement decides, and over budget nothing merges.
