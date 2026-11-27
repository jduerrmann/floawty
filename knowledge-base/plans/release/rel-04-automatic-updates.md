---
type: plan
tags: [package, release, dist, ui]
status: planned
created: 2026-11-20
updated: 2026-11-27
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
  ([[one-running-floawty]], `tauri-plugin-single-instance` approved).
- Non-goals: install at Windows shutdown, install during playback, a stored
  last-check time (start plus a 24 h timer is enough).
- Read first: rel-03, [[updates-by-tauri-updater]], `commands.rs` (quit, reset and
  graphics restarts), [[one-running-floawty]].

## Decided (visual plan "Release 0.1.0 – der Rest", 2026-11-27)
- After an install on quit floawty stays closed (`restart_after_install(false)`);
  the next start runs the new version.
- A second start brings the open window to the front and ends itself.
- Portable: a found update shows as a dot on the settings button and a line with
  the release-page button in the General card.

## Acceptance criteria
- [ ] Off: no automatic request ever (network log over a run).
- [ ] On: one check at start and one per 24 h of running; nothing while it is off.
- [ ] A found update installs only on a user quit (bar or window close), not on the
      restarts for "Reset all data" and graphics acceleration, not at shutdown.
- [ ] After an install on quit floawty stays closed; the next start is the new
      version.
- [ ] A second start shows the running window in front and ends; an app test run
      is not blocked by the maintainer's own floawty (the guard follows the data
      folder).
- [ ] floawty never quit normally (crash, shutdown): the next start does not leave a
      broken state; the download is repeated at most once per start.
- [ ] Portable: a found update shows as a dot on the settings button and a line in
      the General card.

## Tests first
- Rust: the schedule (start, 24 h, off), the "install on this kind of quit" decision.

## Checks
- `npm run verify`, the rel-03 harness with automatic updates on, network log.

## Resume here
Not started; waits for rel-03.
