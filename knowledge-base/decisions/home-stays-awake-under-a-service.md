---
type: decision
area: window
tags: [resources, webview, home, non-goal]
status: active
created: 2026-11-22
updated: 2026-11-22
source: visual plan "Hell/Dunkel und Hover-Effekt", round 3; maintainer's answer after re-measuring, 2026-11-22
---

# The home page stays awake under a service

## Context
A service lies over floawty's own page, which stays loaded and visible to WebView2.
The maintainer asked for a console-like menu that sleeps while watching, and approved
it on headless Edge figures (5–22 MB saved). They did not hold on real WebView2.

## Decision
- floawty does not hide, suspend or unload the home page under a service
  (maintainer, 2026-11-22: "Ja, streichen").

## Alternatives
- Hide it (`Webview::hide`) – back in 13–40 ms, but saves nothing after 8 s and a
  median 3 MB after 90 s (five pairs, one outlier −42 MB): too little for the risk
  to keyboard focus, waking paths and blank frames.
- `MemoryUsageTargetLevel` low – lowers the working set (about −25 MB at 8 s), not
  the private bytes of the budget, and needs a new direct dependency.
- `TrySuspend` – not measured on WebView2; misses state events, same dependency.
- Reload it while hidden – saved nothing.
- Switch the effect or tiles off with CSS while covered – freed no memory reliably
  (headless Edge).

## Consequences
- What the tiles keep after hovering ([[tiles-tilt-with-light]]) also counts while
  watching.
- Measure webview memory on WebView2 itself: headless Edge misled here.
- Evidence and the checked design, should this return: [[gl-04-sleeping-home]].
