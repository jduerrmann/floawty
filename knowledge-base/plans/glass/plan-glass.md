---
type: plan
tags: [plan-map, glass, ui]
status: active
created: 2026-11-21
updated: 2026-11-22
source: visual plan "Startseite und Einstellungen neu gestalten", rounds 1–4, 2026-11-21
---

# Plan – Glass design for home, settings and bar

## Outcome
Home, settings, bar, first-start notice and add-page form look like one high-quality
app in a glass design that follows Windows light or dark, with redrawn service logos.
Decisions: [[glass-design-follows-windows-theme]], [[redrawn-service-logos]].
Planning page and pictures: `.claude/plans/startseite-und-einstellungen.md`.

Extended 2026-11-22 (visual plan `.claude/plans/hell-dunkel-und-hover.md`, approved):
[[floawty-theme-choice]], [[tiles-tilt-with-light]], [[home-stays-awake-under-a-service]]
in gl-03 (gl-04 was dropped); where they differ, they win over the list below.

## Decided (visual plan, 2026-11-21)
- Glass. Light: colour-glass tiles tinted in the service colour on a pale indigo-pink
  ground. Dark: the same tiles subtler with a glow on indigo-pink. Live switch with
  Windows (`prefers-color-scheme`).
- Accent cyan for focus, switches, "Done". Segoe UI. Transitions about 150 ms, off
  under `prefers-reduced-motion`; animate only `transform` and `opacity`.
- At 480 × 270 all eleven tiles fit without scrolling (four columns). 240 × 135 may
  scroll.
- Lighter `brandColor` for TikTok (#25f4ee), Disney+ (#3d7bff), Apple TV
  (#c7c7d1), no new manifest field; every tile's name sits on a solid shade that
  reaches 4.5 : 1 against white.
- No `backdrop-filter`, no looping animation (tiles RAM is near its budget).
- All ten service logos redrawn as SVG, as close to the originals as possible, with
  glass effects; `src/assets/logos/NOTICE.md`.
- Settings: one page, groups as glass cards with small headings, "Done" top right,
  switches, styled selects and number field, hotkeys as key chips.
- Bar: own SVG icons (files, CSP) for every control; over a visible service always
  dark glass, pinned in CSS, never through Tauri's theme API; on home and settings
  it follows Windows.
- Element ids stay, so the Playwright specs keep their selectors. No new dependency.

## Constraints
- Rules 5 (no dependency, no icon package), 6 (test first for pure logic), 10 (app
  runs smallest first, after the maintainer's yes), 13 (new texts EN and DE in
  `src/i18n.ts`), 14 as amended by [[leaner-reviews]]: one independent review of the whole plan in
  gl-02, which also changes rules).
- Invariant 7 and [[redrawn-service-logos]]: the logos only identify the service.
- Glass ships before 0.1.0 (maintainer, 2026-11-21): rel-07 waits for gl-02.
  rel-03's update button goes into the General card, rel-05's export and import into
  the Data card next to reset; gl-02 styles whichever exists when it runs, the rel
  package landing later follows the cards.
- One branch per package (`feat/gl-NN-…`), commit after the maintainer's OK.

## Packages

Base commit for the plan's review (AGENTS.md rule 14): `d529002`.

| # | Package | Outcome | Depends on |
|---|---|---|---|
| 01 | [[gl-01-glass-home]] | Design values, colour-glass tiles with AA labels, notice and form as glass | – |
| 02 | [[gl-02-logos-settings-bar]] | Redrawn logos, settings as glass cards, bar icons dark over video; plan review and measurement | 01 |
| 03 | [[gl-03-theme-and-hover]] | floawty's own light/dark with title bar; tilting tiles under a moving light | 02 |
| 04 | [[gl-04-sleeping-home]] | Dropped 2026-11-22, never built: hiding the home saves about 3 MB | – |
| 05 | [[gl-05-animations-and-notice]] | Animations can be off; the first-start notice lies over the tiles | 03 |

gl-03 touches IPC, the stored format and the shell, so it gets an independent review
before the commit proposal; gl-05 likewise (stored format, IPC).

gl-02 merges the former packages for logos, settings and bar ([[leaner-reviews]]).
