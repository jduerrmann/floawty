---
type: plan
tags: [package, glass, ui, logos, settings, bar]
status: done
created: 2026-11-21
updated: 2026-11-24
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
- [x] Ten recognisable logo redraws, plain SVG (paths only, no text, raster or
      script), each naming its owner and NOTICE.md; NOTICE states trademarks, no
      GPL, no affiliation, removal on request, provenance (hand-drawn, date, no
      copied path data). README, AGENTS.md, INDEX, core-principles agree. The
      maintainer checks the logos on screenshots before the commit.
- [x] Settings: cards General (language, update check, update button once rel-03
      exists, graphics acceleration), Hotkeys, Shorts and TikTok, Data (export and
      import once rel-05 exists, reset); headings EN/DE; the trademark line.
- [x] Switches (`role="switch"`, Space toggles) keep ids and `change` events; the
      restart confirm still appears and cancels. Hotkeys as localized key chips with
      the full combination as accessible name. "Delete everything" the only red
      control. Tab follows the reading order; Esc closes.
- [x] Bar: icons as files (CSP) for grip, back, click-through, on top, auto mode,
      video only, zoom, window mode, settings, close; pressed and problem-dot states
      show. A service open and settings closed pins `color-scheme: dark`; otherwise
      the bar follows Windows. Shadow fits the 4 px room; width no more than today
      (± 4 px); accessible names unchanged.
- [x] Home, settings and bar follow Windows light/dark; texts reach AA.
- [x] Idle RAM on the tiles and RAM/CPU with a playing video within engineering
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

## Evidence
- Tests first: `manifest.test.ts` red (symbol not in `logos/`, shapes-only check),
  then green; `hotkeyParts` red (missing), then green. Playwright: settings spec
  (switch by role, Space opens the restart confirm, hotkey names) and bar spec (dark
  pin) written, not run yet.
- Logos: nine built as plain SVG shapes by a generator script (kept outside the
  repo), tight `viewBox` per logo so wide marks fill the tile. Screenshots light/dark
  at 480 × 270 and large on brand colour sent to the maintainer. Disney+: two free
  redraws (own, then Codex from a description) rejected by the maintainer; the
  maintainer chose a Codex trace of an image of the logo (OK 2026-11-21), recorded in
  NOTICE and [[redrawn-service-logos]].
- Screenshots of the built pages with a faked bridge (headless Edge): settings light,
  dark German, 480 × 270, both confirms open; bar on tiles light/dark, over a service
  (pinned dark, pressed and problem dot), with settings open (light).

- Independent review of the whole plan since `d529002` (advisor, 2026-11-21),
  incl. the rule changes of 4438853; no must-fix. Resolved: S1 recording prompt in
  accent failed AA in light → text colour; S2 pressed bar icon ≈ 2.7 : 1 in light →
  text colour on the accent tint; S3 NOTICE provenance said "by hand" → describes
  generator, Codex and the Disney+ trace; S4 rule 14 "since `main`" loses merged
  packages and paused plans → base commit in the plan map, review also due on pause or
  drop (AGENTS.md, [[leaner-reviews]], [[plan-glass]]); N2 logo test now allows the
  `symbols/` fallback; N3 advisor description and decisions hook follow
  [[leaner-reviews]]. S5 (gl-01 note stale) fixed by e0b0d09, merged. Left: N1 (CDP pages emulating light) and N4 (docked strip dark over a
  service, as decided) – checked in the app run. `npm run check` green after the fixes.
- `npm run measure` 2026-11-22 (release build, maintainer's yes) 3/3 green: portable
  3.3 MiB, start 47 ms, idle on the tiles 241.8 MB RAM / 0 % CPU (gl-01: 236.9 MB;
  budget 250 MB), YouTube 1080p 725 MB / 0.33 % CPU at 66.3 fps, hidden 721.6 MB;
  within [[mvp-measurements]] budgets.
- App specs 2026-11-22 (release build, maintainer's yes; smoke, tiles, settings,
  graphics-acceleration, bar, on-top, video-only, zoom): 33/34 green, incl. the new
  settings assertions (switch by role, Space opens the confirm, hotkey names) and the
  dark-pin bar test. Failed: bar "◀ … shows the tiles" at its first step – the bar did
  not appear on hover within 5 s (Rust cursor watcher; no Rust, hover or harness code
  changed since `main`; the same hover step passed in the test before). Re-run of the
  bar spec after the maintainer's yes: 10/10 green, so a one-off hover miss.

## Resume here
Done. On `main` (be9a7b0); plan closed 2026-11-24.
