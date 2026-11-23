---
type: plan
tags: [package, tests, process]
status: planned
created: 2026-11-23
updated: 2026-11-23
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
- [ ] Three consecutive `smoke:hidden` runs, all green; a red run is reported with its
      cause instead of tinkered with.
- [ ] gl-05: all app tests hidden and the hover measurement with animations off, RAM
      compared with the build before it (measured the same way); gl-05 `done`.
- [ ] Independent review of all the plan's changes since `main`, findings resolved.

## Checks
- Three hidden runs (announced); gl-05's measurement.

## Resume here
Not started. Starts after qt-04.
