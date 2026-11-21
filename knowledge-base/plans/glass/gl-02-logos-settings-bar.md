---
type: plan
tags: [package, glass, ui, logos, settings, bar]
status: planned
created: 2026-11-21
updated: 2026-11-21
source: visual plan "Startseite und Einstellungen neu gestalten", 2026-11-21; advisor plan check; merged per [[leaner-reviews]]
---

# gl-02 – Logos, settings and bar in the glass design

Plan: [[plan-glass]]

## Outcome
The tiles show redrawn service logos, the settings are one page of glass cards, and
the bar has its own icons and stays dark over a video, so the whole app shares the
glass design; the plan ends with one independent review and a resource check.

## Scope
- Logos: `src/assets/logos/*.svg` + `NOTICE.md` (new), the ten manifests' `symbol`,
  `src/services/manifest.ts` (`symbol` in `logos/` or `symbols/`) + test, asset globs
  in `src/tiles.ts`, README licence section, AGENTS.md rules 7 and 9,
  [[core-principles]] ("Amended by", invariant 1 exception approved 2026-11-21),
  `knowledge-base/INDEX.md`, [[tech-services]]. Removes the ten unused own symbols.
- Settings: settings part of `src/index.html`, `src/settings.css` (today's dark look
  from gl-01, replaced), `src/settings-panel.ts`, `src/hotkey-list.ts`, `src/hotkeys.ts`
  (pure `hotkeyParts`) + test, `src/i18n.ts` (group headings, trademark line),
  `tests/settings.spec.ts`, `tests/graphics-acceleration.spec.ts`.
- Bar: `src/bar.html`, `src/bar.css`, `src/bar.ts` (scheme class), `src/click-through.ts`
  (styles), `src/assets/icons/*.svg`, `tests/bar.spec.ts`.
- Docs: [[tech-bar-and-settings]], CHANGELOG.
- Non-goals: official logo files, new settings or controls, tabs, changed hover
  timing or bar widths, Tauri's theme API.
- Read first: [[redrawn-service-logos]], [[glass-design-follows-windows-theme]],
  [[tech-bar-and-settings]], [[bar-leaves-the-page-clickable]], `src/tokens.css`.

## Acceptance criteria
- [ ] Ten recognisable logo redraws, plain SVG (paths only, no text, raster or
      script), each naming its owner and NOTICE.md; NOTICE states trademarks, no
      GPL, no affiliation, removal on request, provenance (hand-drawn, date, no
      copied path data). README, AGENTS.md, INDEX, core-principles agree. The
      maintainer checks the logos on screenshots before the commit.
- [ ] Settings: cards General (language, update check, update button once rel-03
      exists, graphics acceleration), Hotkeys, Shorts and TikTok, Data (export and
      import once rel-05 exists, reset); headings EN/DE; the trademark line.
- [ ] Switches (`role="switch"`, Space toggles) keep ids and `change` events; the
      restart confirm still appears and cancels. Hotkeys as localized key chips with
      the full combination as accessible name. "Delete everything" the only red
      control. Tab follows the reading order; Esc closes.
- [ ] Bar: icons as files (CSP) for grip, back, click-through, on top, auto mode,
      video only, zoom, window mode, settings, close; pressed and problem-dot states
      show. A service open and settings closed pins `color-scheme: dark`; otherwise
      the bar follows Windows. Shadow fits the 4 px room; width no more than today
      (± 4 px); accessible names unchanged.
- [ ] Home, settings and bar follow Windows light/dark; texts reach AA.
- [ ] Idle RAM on the tiles and RAM/CPU with a playing video within engineering
      standards §7, compared with [[mvp-measurements]].

## Tests first
- Vitest: every manifest's `symbol` exists in `logos/` or `symbols/` and contains no
  `<script`, `<image` or `<text`; `hotkeyParts("Ctrl+Alt+Shift+Up", "de")` →
  `["Strg","Alt","Umschalt","↑"]`.
- Playwright: graphics acceleration by `role=switch`, Space opens the confirm; hotkey
  assertions read the accessible name; bar pinned dark with a service open, not with
  settings open, not on the tiles in light scheme.

## Checks
- `npm run check`; screenshots light/dark; one independent review of the plan's
  changes since `main` (AGENTS.md rule 14), including the rule changes of
  [[leaner-reviews]] committed without one; one app run (smoke, tiles, settings,
  graphics-acceleration, bar, on-top, video-only, zoom specs) and `npm run measure`
  after the maintainer's yes.

## Resume here
Waiting for gl-01. Next action: logos first (largest visible change, needs the
maintainer's look), then settings, then bar.
