---
type: plan
tags: [package, release, dist, ui]
status: done
created: 2026-11-20
updated: 2026-11-28
source: visual plan "Phase 3 – Release-Pipeline", approved 2026-11-20; advisor review
---

# rel-04 – Automatic updates install when the user quits

Plan: [[plan-release]]

## Outcome
With "Update automatically" on (off by default), floawty checks at start and every
24 hours, downloads a found update in the background and installs it when the user
quits floawty; the next start runs the new version. A portable build shows a found
update as a hint.

## Scope
- Owns: the automatic part of `updates.rs`, the quit path in `commands.rs`, the
  settings field label (`updateCheck` keeps its meaning: consent to contact GitHub on
  its own, no migration), i18n, CHANGELOG, the single-instance guard
  ([[one-running-floawty]]; own code in `single_instance.rs`, not the plugin, see the
  decision's amendment).
- Non-goals: install at Windows shutdown, install during playback, a stored
  last-check time (start plus a 24 h timer is enough).
- Read first: rel-03, [[updates-by-tauri-updater]], `commands.rs` (quit, reset and
  graphics restarts), [[one-running-floawty]].

## Decided (visual plan "Release 0.1.0 – der Rest", 2026-11-27)
- After an install on quit floawty stays closed (`restart_after_install(false)`);
  the next start runs the new version.
- A second start brings the open window to the front and ends itself. Guard per data
  folder with own code; the plugin would end every app-test floawty (2026-11-28).
- Switching "Update automatically" off drops a downloaded update; a quit installs only
  while the switch is on.
- Portable: a found update shows as a dot on the settings button and a line with
  the release-page button in the General card.

## Acceptance criteria
- [x] Off: no automatic request ever (network log over a run).
- [x] On: one check at start and one per 24 h of running; nothing while it is off.
- [x] A found update installs only on a user quit (bar or window close), not on the
      restarts for "Reset all data" and graphics acceleration, not at shutdown.
- [x] After an install on quit floawty stays closed; the next start is the new
      version.
- [x] A second start shows the running window in front and ends; an app test run
      is not blocked by the maintainer's own floawty (the guard follows the data
      folder).
- [x] floawty never quit normally (crash, shutdown): the next start does not leave a
      broken state; the download is repeated at most once per start.
- [x] Portable: a found update shows as a dot on the settings button and a line in
      the General card.

## Tests first
- Rust: the schedule (start, 24 h, off), the "install on this kind of quit" decision.

## Checks
- `npm run verify`, the rel-03 harness with automatic updates on, network log.

## Evidence (2026-11-28)
- Built by `coder` from a brief (package, then review fixes); lead: the launcher's
  `last-shell` (file and parameters of the swallowed `ShellExecuteW`), the specs, the
  shared `tests/update-server.ts`, docs. Lead read the full diff.
- Tests first: Rust (folder names, schedule, download plan, quit decision) and Vitest red
  then green; app specs new.
- `npm run check` green. Hidden: `tests/auto-update.spec.ts` 7/7 (off: no request in
  2 s; on: manifest and download at start, quit and window close install with
  `/P /UPDATE` and no `/R`; reset restart and switch-off do not install; switching on
  checks at once; portable dot and release page), `tests/single-instance.spec.ts` 3/3,
  `tests/update.spec.ts` 7/7 (now asserts `/P /UPDATE /R` and the release URL), all
  hidden app tests 82/82. The 24 h interval is covered by the Rust schedule tests only.
- Shutdown: tao 0.37.2 ends the process on `WM_ENDSESSION` without `CloseRequested`, so
  a shutdown never installs (read in the source by coder and the reviewer).
- Crash: a downloaded update lives only in memory; the next start checks and downloads
  again once.
- Independent review by `advisor`: no must-fix. Resolved: tests for window close,
  switch-off and minimized; the event handle stays open on release; name buffers outlive
  the calls; a quit installs only with the switch on; an older ready update stays until
  a newer one downloaded. Open: `overlay.rs` is 420 counted lines (limit 400, 406
  before this package); the maintainer chose a split as its own package after rel-04. A
  start during a running passive setup is ended by the setup (not verified with NSIS).
- `npm run measure` (hidden, maintainer's yes 2026-11-28), against `main` e047728 built
  into `target/baseline`: start to visible window 257 → 306 ms (medians of 5; samples
  250–653 and 299–462), budget 400 ms; idle RAM 219.5 MB in both, CPU 0 %; portable
  4.0 → 4.1 MiB; idle network: one Microsoft host in both, no GitHub. The added start
  work is a mutex, an event and two threads; the 49 ms were not traced further.

## Resume here
Done and measured on `feat/rel-04-automatic-updates`. Next: the `overlay.rs` split, then
rel-06.
