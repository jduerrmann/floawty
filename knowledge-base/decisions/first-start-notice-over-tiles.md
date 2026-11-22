---
type: decision
area: ui
tags: [notice, privacy, first-start]
status: active
created: 2026-11-22
updated: 2026-11-22
source: visual plan "Kachel-Animationen abschalten", round 1, approved 2026-11-22
---

# The first-start notice lies over the tiles and waits for OK

Amends the placement in [[mvp-scope-and-controls]] ("above the tiles"); the content
of [[webview2-diagnostics-disclosed]] stays.

## Context
The notice pushed the third row of tiles out of the default window. At 240 × 135 it
was 224 px high, so its OK was outside the window.

## Decision
- A card in the middle over the dimmed start page. The tiles are inert until OK, so
  the disclosure is seen before a tile loads a service.
- OK has the focus. The window can still be dragged and the bar works, settings
  included.
- In narrow or flat windows OK stands beside the text and only the text scrolls.
- No blur and no animation.

## Alternatives
- A card at the bottom with usable tiles – easy to pass over.
- A card at the bottom with blocked tiles – less clear than the middle.
- `<dialog>` with `showModal()` – would also make the settings inert, which open in
  the same page from the bar.

## Consequences
- App tests that use tiles on a fresh profile accept the notice first.
- The gate is the page's: a start that reopens the last service does not wait for
  OK. Without OK none can be saved, except by a build from before this change.
