---
type: decision
area: process
tags: [tests, agents, rules, workflow]
status: active
created: 2026-11-22
updated: 2026-11-22
source: conversation (maintainer, 2026-11-22)
---

# App runs go smallest first: red specs, all app tests, measurement last

Amends [[app-tests-ask-first]].

## Context
Checking gl-03 took three app runs and about 55 minutes on the maintainer's PC,
about 40 of them measuring. Each failure repeated everything. The two red specs on
two builds took 33 seconds and located the regression. The maintainer asked why
everything runs again when only certain things fail.

## Decision
- Three stages, each its own command and reported on its own (AGENTS.md rule 10,
  [[engineering-standards]] §2): named red or new specs, also on the last good build
  when the cause is unclear; all app tests once the code is final; the affected
  measurements once those are green.
- A yes for the first stage covers repeated runs of those named specs, each under a
  minute and announced, until their failure is fixed. Wider runs ask each time.
- Stop at the first result that means the code must change.
- The request says how long mouse and keyboard are really needed.
- `FLOAWTY_TEST_EXE` points the app tests at another build.

## Alternatives
- A yes per run, as before – too many questions for runs of seconds.
- One chain for build, tests and measurement – locks the PC for over 20 minutes and
  measures code that then changes.
- App tests in Windows Sandbox, with their own mouse – deferred, not rejected: needs
  a Windows feature only the maintainer can turn on and a trial of WebView2 there
  (open question 11).

## Consequences
- The full app run still moves to CI with [[rel-01-ci]]; measurements stay local.
- A failed measurement no longer skips the ones after it.
