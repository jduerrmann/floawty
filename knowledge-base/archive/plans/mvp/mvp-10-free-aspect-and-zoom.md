---
type: plan
tags: [package, mvp, window, services]
status: done
created: 2026-11-18
updated: 2026-11-18
source: visual plan "Freies Seitenverhältnis", rounds 1–2, approved 2026-11-18
---

# mvp-10 – Free overlay shape and zoom over baked-in bars

Plan: [[plan-mvp]]

## Outcome
The floaty overlay takes any shape (magnets at 16:9 and 12:5), and with the zoom switch
on, in a shape wider than 16:9 the picture fills the width, so films with bars baked into a 16:9 frame
show without them.

## Scope
- Owns: `geometry.rs` (`fit_landscape`), `overlay/settle.rs`; the zoom page script for
  every service and its injection; tests, notes, decision.
- Non-goals: a shape picker in the bar; detecting bars in the picture (protected video
  cannot be read); cropping the sides.
- Read first: [[tech-window]], [[tech-services]], [[tech-video-only]],
  [[overlay-snaps-flush]], [[core-principles]] #7.

## Decided (visual plan, 2026-11-18)
- Shape: dragged freely, snaps onto 16:9 or 12:5 (2.40, changed from 64:27 after the
  design check) within about 4 %; Shorts still turn it 9:16; window mode stays free;
  the shape is saved with the position.
- Zoom: one saved switch (⤢, Ctrl+Alt+Shift+Z, off at first start), for all services,
  only in the floaty view and only while the overlay is wider than 16:9; only top and
  bottom are cut; no zoom beyond 1.5×; ads are zoomed like anything else
  ([[overlay-shape-free-with-zoom]]). AGENTS.md stays unchanged (maintainer).
- Bar: compact controls 22 px so eight fit the 240 px minimum.

## Acceptance criteria
- [x] A free shape is kept; close to 16:9 or 21:9 it snaps; a height-only drag keeps its
      height; Shorts still turn 9:16 and back.
- [x] In a 21:9 overlay a 16:9 video fills the width, a 21:9 video is untouched, and a
      21:9 video in a 16:9 overlay keeps its bars (never cropped at the sides).
- [x] No zoom in window mode or where the video does not fill the view.
- [x] Live with the maintainer's accounts: zoom works or fails soft per service.
- [x] Budgets still met; notes, decision, CHANGELOG.

## Tests first
- geometry: free shape kept, magnets, dragged axis (done).
- adapter: zoom on a fixture with a 16:9 video in a 21:9 viewport, a 21:9 video, a 16:9
  viewport, window mode, a small video.

## Checks
- `npm run verify`, `npm run measure`, live checks.

## Resume here
Branch `feat/mvp-10-free-aspect-and-zoom`. Geometry done (97 cargo tests). Zoom design
sent to the advisor before building (adapter contract, principle 7).
