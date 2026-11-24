---
type: plan
tags: [package, glass, ui]
status: done
created: 2026-11-21
updated: 2026-11-24
source: visual plan "Startseite und Einstellungen neu gestalten", 2026-11-21; advisor plan check
---

# gl-01 – Home in colour glass with readable tiles

Plan: [[plan-glass]]

## Outcome
The home page shows colour-glass tiles in light and dark following Windows, every
tile name readable at WCAG AA, and the first-start notice and add-page form as glass
cards, built on shared design values the later packages reuse.

## Scope
- Owns: `src/tokens.css` (new: colours as `light-dark()` pairs so a subtree can pin
  a scheme, accent, radii, spacing, shadows, motion, error red with a light value),
  `src/tile-colors.ts` + test (new), the `brandColor` of TikTok, Disney+ and Apple
  TV, `src/tiles.ts` (tiles, popover menu), `src/tiles.css`, `src/assets/icons/more.svg`,
  `src/home.ts`, `src/style.css`, `src/settings.css` (old look moved, pinned dark),
  `src/index.html` (stylesheets, tile-area wrapper, button classes), `vite.config.ts`
  (`cssTarget`), `tests/tiles.spec.ts`, [[tech-services]] tile section, CHANGELOG.
- Non-goals: logos, settings layout and bar (gl-02), new texts,
  `backdrop-filter`, looping animation.
- Read first: [[glass-design-follows-windows-theme]], [[tech-services]] (tiles),
  engineering standards §1, §5, §7; the pictures in
  `.claude/plans/startseite-und-einstellungen.md`.

## Acceptance criteria
- [x] Light: tinted glass tiles on a pale indigo-pink ground; dark: subtler tiles
      with glow on indigo-pink. Switching Windows light/dark changes the page live
      (one live check).
- [x] Every tile's name sits on a solid lower part whose colour reaches ≥ 4.5 : 1
      against white: services, own pages and "+".
- [x] Hover lifts a tile slightly; focus shows a cyan ring; no motion under
      `prefers-reduced-motion`.
- [x] At 480 × 270 all eleven tiles fit without scrolling; names end in an ellipsis
      at most. With the four-line first-start notice, or at 240 × 135, the tile area
      scrolls and tiles keep at least 52 px (changed in work: fitting the notice
      would squash the tiles to 40 px with unreadable symbols).
- [x] Own tiles: ⋯ menu and "+" tile in the same style; notice and form as glass
      cards; the form's error text is readable in light and dark.
- [x] Settings panel and bar look as today in light and dark (no half-styled state).
- [x] Idle RAM on the tiles measured before and after: still ≤ 250 MB.
- [x] No new dependency; ids unchanged.

## Tests first
- Vitest `tile-colors.test.ts`: `labelShade(color)` reaches ≥ 4.5 against white for
  every manifest's `brandColor`, the own-page colour and #ffffff; returns the colour
  itself when it already passes ("+" has no tint).
- Playwright tiles spec: at 480 × 270, notice accepted, neither the tile area nor the
  page scrolls (today about 222 px of 220).

## Checks
- `npm run check`; screenshots of home at 480 × 270 light and dark for the
  maintainer; one app run (smoke + tiles spec) and `npm run measure` (tiles RAM)
  after the maintainer's yes.

## Evidence
- Tests first: `tile-colors.test.ts` red (module missing), then green; 18 tests incl.
  "no darker than AA needs".
- Screenshots of the built page with a faked bridge (headless Edge): light/dark at
  480 × 270, with notice, 648 × 270, 900 × 300, 1200 × 300, 1280 × 800, 240 × 135,
  German menu on a third own page. Name top at ≥ 62.5 % of the tile in all shapes.
- Independent review (advisor, 2026-11-21): four should-fix, all fixed — fit test
  resized the outer window (now uses the fresh profile's 480 × 270 and counts eleven
  tiles); AA only near 16:9 (tiles are size containers with height-aware metrics);
  German menu clipped (now a top-layer popover placed in the window); `light-dark()`
  lowered in release CSS (`cssTarget: chrome123`). Nits fixed: transitions only on
  `transform`, unused token, duplicate focus rule, owns list, drag region on the tile
  area, bottom-row shadows. Plan-wide review comes in gl-02 ([[leaner-reviews]]).
- App run 2026-11-21 (release build, maintainer's yes): smoke + tiles specs 8/8 green,
  incl. the new 480 × 270 fit. `npm run measure` 3/3 green: portable 3.3 MiB, start
  33 ms, idle on the tiles 236.9 MB RAM / 0 % CPU (before gl-01: 216–224 MB; budget
  250 MB), YouTube 1080p 691.7 MB / 0.42 % CPU at 61.8 fps, hidden 691 MB.
- Not verified by an agent: switching Windows light/dark live in the running app
  (changing a Windows setting is the maintainer's); the built page switches with
  `prefers-color-scheme` in screenshots.

## Resume here
Done. On `main` (4438853, ee5a38d). The maintainer's live light/dark switch check
passed on main 8dbd458 (2026-11-24).
