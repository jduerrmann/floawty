---
type: plan
tags: [package, glass, ui]
status: in-progress
created: 2026-11-21
updated: 2026-11-21
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
- [ ] Light: tinted glass tiles on a pale indigo-pink ground; dark: subtler tiles
      with glow on indigo-pink. Switching Windows light/dark changes the page live
      (one live check).
- [ ] Every tile's name sits on a solid lower part whose colour reaches ≥ 4.5 : 1
      against white: services, own pages and "+".
- [ ] Hover lifts a tile slightly; focus shows a cyan ring; no motion under
      `prefers-reduced-motion`.
- [ ] At 480 × 270 all eleven tiles fit without scrolling; names end in an ellipsis
      at most. With the four-line first-start notice, or at 240 × 135, the tile area
      scrolls and tiles keep at least 52 px (changed in work: fitting the notice
      would squash the tiles to 40 px with unreadable symbols).
- [ ] Own tiles: ⋯ menu and "+" tile in the same style; notice and form as glass
      cards; the form's error text is readable in light and dark.
- [ ] Settings panel and bar look as today in light and dark (no half-styled state).
- [ ] Idle RAM on the tiles measured before and after: still ≤ 250 MB.
- [ ] No new dependency; ids unchanged.

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
  "no darker than AA needs". Tiles spec step for the 480 × 270 fit written, not run yet.
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

## Resume here
Branch `feat/gl-01-glass-home`, uncommitted. `npm run check` green after the review
fixes. Next: one app run (smoke, tiles spec, `npm run measure` for tiles RAM) after
the maintainer's yes, then the commit proposal.
