---
type: decision
area: process
tags: [tests, agents, rules]
status: active
created: 2026-11-20
updated: 2026-11-24
source: conversation (maintainer, 2026-11-20); advisor review
---

# App tests run only after the maintainer's yes, muted, one agent at a time

One run per yes and one run per package: amended by [[app-runs-smallest-first]]. Asking
before hidden runs: superseded by [[app-tests-run-hidden]].

## Context
Several agent sessions ran the Playwright app tests again and again, sometimes at
the same time. App tests drive the real mouse, keyboard and global hotkeys and open
floawty windows; videos played with sound. The maintainer could not use the PC, and
two runs on the shared debug port broke each other.

## Decision
- `npm run check` holds the quiet checks: types, lint, format, Vitest, adapter tests
  in headless Edge (page scripts built first), cargo fmt, clippy, cargo test.
  `npm run verify` is check, build and the app project (`npm run smoke`).
- App tests (the app project, `npm run measure`, live probes) run only after the
  maintainer says yes, one run per yes, never two agents at once; normally once per
  package, after the review fixes and before the commit proposal (AGENTS.md rule 10).
- App tests start floawty with `--mute-audio`.

## Alternatives
- Settings `ask` rules for `npm run verify|smoke|measure` – would turn the yes into a
  prompt; not chosen yet, the maintainer can add them.
- Tests without the real cursor – the bar reacts to where Windows sees the cursor;
  faking it needs a hook in the shipped app.

## Consequences
- The full app check moves to CI once [[rel-01-ci]] runs it per pull request; until
  then it runs locally on request.
- Budget measurements of YouTube playback are muted from 2026-11-20
  ([[mvp-measurements]]).
