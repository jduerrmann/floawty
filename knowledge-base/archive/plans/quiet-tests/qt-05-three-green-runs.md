---
type: plan
tags: [package, tests, process]
status: done
created: 2026-11-23
updated: 2026-11-24
source: visual plan "Testen ohne deinen Bildschirm" and the re-cut in chat, 2026-11-23
---

# qt-05 – Three green hidden runs, gl-05 closed

Plan: [[plan-quiet-tests]]

## Outcome
All package tests pass hidden three times in a row, gl-05 is closed with its app run
and measurement, and the plan's changes have their independent review.

## Scope
- Owns: evidence in this package, gl-05's open items, the plan's archive step.
- Non-goals: new test coverage.
- Read first: [[plan-quiet-tests]], [[gl-05-animations-and-notice]].

## Acceptance criteria
- [x] Three consecutive `smoke:hidden` runs, all green; a red run is reported with its
      cause instead of tinkered with.
- [x] gl-05: all app tests hidden and the hover measurement with animations off, RAM
      compared with the build before it (measured the same way); gl-05 `done`.
- [x] Independent review of all the plan's changes since `main`, findings resolved.

## Checks
- Three hidden runs (announced); gl-05's measurement.

## Evidence
- Base (maintainer, 2026-11-24): the startup-race fix (05b18b9) and the stricter bar
  test (9d9193d) from their own sessions merged first; floawty rebuilt.
- Three consecutive `smoke:hidden` runs: 47/47, 47/47, 47/47 (about 1.5 min each),
  nothing left. A fourth after the review fixes: 47/47.
- gl-05 (measured hidden, maintainer's yes): hover with animations off 224.4, 225.7,
  224.2 MB (median 224.4), on 244.4 MB; gl-05 set `done`.
- Plan-wide independent review (advisor, 2026-11-24): no must-fix. Fixed: a direct
  `playwright test` now fails before starting floawty (`test-input run` sets
  `FLOAWTY_TEST_RUN`, `startFloawty` requires it; test red first, shown on a real
  direct run); the runner refuses every `--ui*` flag and attached short values (red
  first); CONTRIBUTING and `.claude/agents/coder.md` describe the hidden runs;
  amendment pointers in [[stack-by-spike]] and [[app-tests-ask-first]]; `pointAway`
  unexported. Taken as noted: unused foreground names stay (qt-03's named states);
  `session.rs` 373 and `state.rs` 341 counted lines, under 400; the
  `.claude/settings.json` allow entry stays the maintainer's; CI's script is open
  question 14.
- Lasting knowledge: [[tech-app-tests]] (new), INDEX rows.

## Resume here
Done (2026-11-24). Plan archived.
