---
type: plan
tags: [package, glass, theme, tiles, settings]
status: in-progress
created: 2026-11-22
updated: 2026-11-22
source: visual plan "Hell/Dunkel und Hover-Effekt", approved by the maintainer 2026-11-22
---

# gl-03 – floawty's own light or dark, and the tilting tiles

Plan: [[plan-glass]]

## Outcome
floawty can be light or dark independently of Windows, and its tiles answer the
pointer with light and a gentle tilt that never leaves their box.

## Scope
- Theme: `settings.rs` (`Theme`, preferences), `overlay.rs` (state), `src/theme.rs`
  (Rust: startup script, title bar) with `windows-sys` feature `Win32_Graphics_Dwm`,
  `main.rs`, `bar.rs`, `src/state.ts`, `tokens.css`, settings markup, styles and
  texts (EN, DE).
- Tiles: `src/tilt.ts` (pure) + test, `src/tiles.ts`, `tiles.css`, `style.css`,
  `tests/adapters/tile-hover.spec.ts`. Includes the scrollbar fix found 2026-11-22.
- Non-goals: theming services, sign-in window or tooltips; Tauri's theme API; new
  dependencies; settings for the effect.
- Read first: [[floawty-theme-choice]], [[tiles-tilt-with-light]].

## Acceptance criteria
- [ ] `system` by default and following Windows live; `light`/`dark` apply at once to
      tiles, settings, bar and the window-mode title bar, survive a restart and
      paint right from the first frame; reset returns to `system`.
- [ ] A forced title bar survives a Windows setting change; back to `system` takes
      Windows' colour at once. Services' `prefers-color-scheme` is untouched.
- [ ] A file without or with an unknown `theme` reads as `system`, the rest intact.
- [ ] Bar dark over a service under every choice; "+" readable under every choice.
- [ ] Segments are radios in a named group, reachable by Tab and arrows.
- [ ] The tilted face stays in its box for every pointer position and tile shape; no
      scrollbar, no cut at 240 × 135 to 3440 × 1440; clicks work up to the tile's
      edge; resting layout unchanged; ⋯ moves along and its menu works.
- [ ] Focus glows without motion; reduced motion keeps only the glow.
- [ ] Idle RAM on the tiles measured before and after hovering, shown to the
      maintainer; over 250 MB blocks the merge.

## Tests first
- Cargo: theme default, unknown value, round trip through preferences; startup
  script per theme; the title-bar colour per choice and Windows theme.
- Vitest: `withShortsAuto` keeps the theme; `tiltOf` is flat in the centre and keeps
  all corners inside for a grid of shapes and pointers.
- Adapter project (headless): real markup and CSS with `tiltOf`: no scrollbar, no
  cut, resting grid unchanged.
- App: the three choices on home and bar, restart, dark pin over a service.

## Checks
- `npm run check`; screenshots light/dark; independent review; app run and
  `npm run measure` after the maintainer's yes.

## Evidence
- Plan check (advisor, 2026-11-22): go with changes; taken: subclass without Tauri,
  no colour media query, observer in the startup script, attribute 19 fallback,
  tests for the reset message and the services' scheme, class names on the face.
- Tests first, red then green: theme setting, title bar rules, `tiltOf`/`tiltStyle`,
  hover spec (headless). `tests/theme.spec.ts` written, not run.
- Built page, headless Edge: both schemes, 240–1740 px, ⋯ menu, click at the edge.
- Real WebView2 probe: scheme right at the first frame; RAM see
  [[tiles-tilt-with-light]].
- Independent review (advisor, 2026-11-22), no blocker in shell, IPC or format.
  Fixed: the light broke the names' AA (now ends above the shade; headless test red,
  then green), tech-note row and field, subclass failure logged, app tests for first
  paint, segments by keyboard, "+" per choice, bar pin per choice, pointer handler.
  gl-04 references were cleaned when it was dropped. Rejected: try/catch around
  sessionStorage (only floawty's own origin runs the script, rule 5); guards against
  repeated property and storage writes (work only per pointer move or state event).

## Resume here
Committed on `claude/gl-02-logos-settings-bar-6fbd9c` at the maintainer's request
before the app run (2026-11-22), not pushed: implemented, reviewed (the scrollbar fix
too), `npm run check` green. The app run happens together with the start-race fix
(port 9334, branch `claude/cool-noyce-12b84f`), on a tree that has both branches;
gl-01 and gl-02 come with this one. Next there:
1. After the maintainer's yes, one run: release build, all app specs (`npm run
   smoke`; the theme spec and the pointer test in the tiles spec have never run),
   `npm run measure` (new: idle after hover; its RAM is printed, not asserted).
2. Measure that same hover on be9a7b0 for comparison (rebuild from that commit).
3. Maintainer decides open question 10 (RAM after hovering); over the idle budget
   nothing merges. Then tick the criteria, record the numbers, set `done`.
Also open from gl-01: the maintainer's live light/dark switch check.
