---
type: plan
tags: [package, glass, motion, notice, settings]
status: in-progress
created: 2026-11-22
updated: 2026-11-22
source: visual plan "Kachel-Animationen abschalten", approved by the maintainer 2026-11-22
---

# gl-05 – Animations can be off, and the notice lies over the tiles

Plan: [[plan-glass]]

## Outcome
floawty's animations can be switched off for less memory, and the first-start notice
covers the start page instead of pushing the tiles away.

## Scope
- Setting: `settings.rs`, `overlay.rs`, `src/state.ts`, settings markup, texts (EN, DE).
- Motion: `tokens.css`, `tiles.css`, `bar.css`.
- Notice: `index.html`, `home.ts`, `style.css`.
- Tests: adapter (motion, notice), tiles and settings specs, hover measurement.
- Non-goals: services' own animations; a restart prompt; startup script or Rust code
  for motion beyond the field; new dependencies; export (rel-05).
- Read first: [[animations-switch]], [[first-start-notice-over-tiles]].

## Acceptance criteria
- [ ] Off: no tilt, floating logo, moving light, fade or bar animation, at once on
      home and bar; the glow stays; on again restores them.
- [ ] The choice survives a restart; a file without the field reads as on, the rest
      intact; reset returns to on; Windows' reduced motion still wins.
- [ ] The switch is a named switch below the theme with its note, in EN and DE.
- [ ] The notice moves no tile; tiles take neither click nor key until OK; OK has the
      focus; settings open from the bar while it shows.
- [ ] From 240 × 135 to 3440 × 1440, both languages and schemes: OK is inside the
      window, the text is readable and scrolls only where it cannot fit.
- [ ] Hover RAM started with "off" is clearly below 267 MB (median of three).

## Tests first
- Cargo: default, stored false, through the preferences. Vitest: preferences keep it.
- Adapter (headless): off against on for tiles and bar; notice per size and language.
- App: the switch at once and after a restart; the notice over inert tiles.

## Checks
- `npm run check`; screenshots; independent review; after the maintainer's yes each:
  new app specs, all app tests, hover with "off" three times.

## Evidence
- Plan approved 2026-11-22; the centred notice checked as a prototype in 24 cases.
- Format check (advisor): go with changes; taken: the key stays a boolean (decision),
  required IPC field pinned by tests, rel-05's allow-list names it.
- Tests first, red then green: Cargo (2), Vitest (1), adapter (4 animations, 28 notice).
  App tests written, not run: switch with restart, notice over inert tiles.
- Built pages driven headless with a fake shell: switch, inert, focus, settings over
  the notice, Windows' reduced motion over "on". Invisible WebView2 probe of the built
  switch after hover: 228 MB off, 255 on (median of five).
- Independent review (advisor, 2026-11-22): ship after one fix. Fixed, red then green:
  OK lost the focus when the settings closed. Also taken: the text takes the keyboard
  for scrolling, contrast asserted per scheme, two notes made exact. Rejected: a Rust
  gate for a reopened service (only older, unreleased builds can save one without OK).
- App stage 1 (2026-11-22): the 8 new and edited specs, 8/8 green on first run (17 s).

## Resume here
Committed and on `main`. `npm run check`, release build and app stage 1 (8 specs)
green, review resolved. Still open: all app tests and the hover measurement with
"off". They wait for testing without the maintainer's screen: plan
`.claude/plans/testen-ohne-bildschirm.md` (round 4, not yet approved; probe sources
in the session notes `quiet-test-probes/`). Then tick the criteria and set `done`.
