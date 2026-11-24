---
type: decision
area: ui
tags: [brand, logo, icon, readme]
status: active
created: 2026-11-22
updated: 2026-11-22
source: visual plan "Neues Logo für floawty", rounds 1–2, and the approval in chat, 2026-11-22
---

# floawty's mark is a jellyfish whose face is a screen

## Context
The app still carried the scaffold's icon, a dark square with a cyan rectangle. The
maintainer wanted a modern mark of floawty's own and chose from eight directions,
four colourings and six letterings.

## Decision
- The mark is a jellyfish: it floats and is see-through like the overlay, and its
  face is a screen. White on a tile in indigo, violet and pink
  (#6467f1, #7d3ced, #dc2978), cyan eyes.
- The colours keep at least half of the icon at 3 : 1 on a dark and on a light
  taskbar in every ICO size
  ([Microsoft's guidance](https://learn.microsoft.com/en-us/windows/apps/design/iconography/app-icon-design)).
- One silhouette at every size. At 32, 24, 20 and 16 px only stroke weights, eye
  arcs, the screen's box, the tile's margin and an even zoom of the jellyfish (up to
  14 %) are tuned.
- The lettering is lower case and drawn as paths: the o is the screen, the y ends in
  a tentacle. On dark ground the eyes in the o are darker cyan (#0e8ea6).
- The mark appears as app icon and in the README. The start screen and the notice
  stay free of it.
- Own work under GPL-3.0: no font, no raster source, no package.

## Alternatives
- Detached window and f monogram – rejected: both resemble apps of the same category
  ("Always on Top", FlowT).
- Hovering pane, wave, balloon, w monogram, winged TV – not chosen.
- A separate coarse drawing for small sizes – rejected: it looked like another
  character.
- One drawing only scaled – rejected: the eyes vanish at 16 px.
- Logo on the start screen – rejected: all eleven tiles have to fit at 480 × 270.

## Consequences
- Sources: `src-tauri/icons/source/` (icon) and `assets/brand/` (README). After an
  icon change run `npm run icons`; never edit the ICO or PNGs by hand.
- A change of the silhouette touches all five icon sources and both logos;
  `src/app-icon.test.ts` fails if one is left behind.
- No check notices an ICO or PNG older than its SVG: comparing renders would tie the
  tests to the CLI's renderer. Run the script and commit both together.
- The running window loads the frame of Windows' large icon size (32 px at 100 %)
  and Windows shrinks it for title bar and taskbar, so that frame must stay readable
  when shrunk.
- The maintainer looked at similar marks and accepted the similar name "FlowT"; no
  trademark register was searched by the agent.
