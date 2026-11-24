---
type: decision
area: process
tags: [resources, measurement, startup]
status: active
created: 2026-11-24
updated: 2026-11-24
source: conversation (maintainer, 2026-11-24); qt-04 calibration
---

# Start time is measured to floawty's main window, with a budget of 400 ms

Supersedes the start budget of [[stack-by-spike]] (≤ 200 ms) and the start values in
[[mvp-measurements]] and [[stack-spike-results]].

## Context
`spikes/measure` timed a start until `Process.MainWindowHandle` was set: the first
visible window without an owner. For floawty that is a 16 × 16 helper window with no
title, visible after about 31 ms, so the recorded 33–49 ms never described the window
a user sees. A probe on the hidden desktop (qt-04, 2026-11-24) showed floawty's main
window (496 × 279) after about 250 ms warm and 360–390 ms with a new profile.

## Decision
- The start time runs from before floawty's process exists until its visible main
  window titled "floawty"; time floawty is held for the test shim does not count
  (`test-input floawty --report-start`, median of 5 hidden starts).
- Budget: ≤ 400 ms.

## Alternatives
- Keep 200 ms to the main window – the measurement would be red until the start gets
  faster; chosen against, the window may appear later on purpose (content ready).
- Keep measuring the first visible window – comparable with old numbers, but says
  nothing about what a user sees.

## Consequences
- Old start values are not compared with new ones.
- Whether the main window can appear sooner is its own question
  ([[open-questions]]).
