---
type: decision
area: window
tags: [geometry, zoom, ads, page-script]
status: active
created: 2026-11-18
updated: 2026-11-18
source: visual plan "Freies Seitenverhältnis", rounds 1–2, and maintainer rulings, 2026-11-18
---

# The overlay takes any shape, and a zoom switch fills the width of a wide one

Amends [[mvp-scope-and-controls]] (the floaty view kept 16:9) and [[core-principles]] #7
for one case (see Decision).

## Context

A 16:9 overlay showed cinema films with bars; dragging only the height changed the width
too. Streaming services often deliver scope films as 16:9 frames with the bars in the
picture, so a wide overlay alone does not remove them, and protected video cannot be read
to detect the bars.

## Decision

- Shape: the floaty view keeps any dragged shape; within 4 % of 16:9 or 12:5 (2.40) it
  snaps onto it. Shorts still turn it 9:16; window mode stays free.
- Zoom: one saved switch (⤢ in the bar, Ctrl+Alt+Shift+Z, off at first start). When on,
  in the floaty view, and only while the overlay is wider than 16:9, the main video of any
  service is scaled to the overlay's width; only top and bottom are cut. Where that
  would need more than 1.5×, there is no zoom (maintainer).
- Ads (maintainer, 2026-11-18): with the switch on, the zoom applies to whatever plays,
  ads included; they still play in full with their controls. floawty never detects ads
  to treat them differently.

## Alternatives

- A shape picker in the bar – rejected: the bar is full (seven controls and the grip).
- The shape following the video's format – rejected: useless for bars in the picture.
- Zoom always automatic without a switch – rejected by the maintainer in favour of a
  switch, so nobody loses picture unasked.
- Pausing the zoom during ads – rejected: detecting ads is out under principle 7.
- `object-fit: cover` on the video – rejected after a live probe: YouTube sizes its
  video element to the picture itself, so only a scale measured from the picture works.
- A note in AGENTS.md invariant 7 – rejected by the maintainer; the ruling lives here.

## Consequences

A common page script runs in every service ([[tech-services]]); a service that sizes
its video so that it does not fill the view simply gets no zoom.
