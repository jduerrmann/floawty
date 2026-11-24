---
type: decision
area: process
tags: [tests, agents, rules, workflow]
status: active
created: 2026-11-24
updated: 2026-11-24
source: conversation (maintainer, 2026-11-23 and 2026-11-24); plan [[plan-quiet-tests]]
---

# App tests run hidden without asking; a short real set runs before releases

Supersedes the "ask before each app run" part of [[app-tests-ask-first]] and the
first-stage yes of [[app-runs-smallest-first]]; their muting, one-run-at-a-time and
smallest-first order stay.

## Context
Every app run took over the maintainer's mouse, keyboard and screen, so each needed a
yes and blocked the PC. [[plan-quiet-tests]] built `tools/test-input`: a hidden
desktop, a kill-on-close job, a run lock and a shim DLL in the tested release exe that
answers hotkeys, input, browser starts, cursor, buttons and foreground from the test.
47 of 49 app tests and the measurements now run there; the test video plays 1080p at
60 fps hidden (measured 2026-11-24).

## Decision
- A hidden run – `npm run smoke:hidden` with optional spec filters, and `verify` –
  starts without a question and is announced with what runs (maintainer, 2026-11-24).
- `npm run measure` runs hidden too but still asks: it needs a quiet PC for about
  ten minutes. A change is compared with its predecessor build measured hidden the
  same way; on-screen numbers from before are not compared with hidden ones.
- Visible runs ask before each run: `npm run smoke:real` (the `@real` release set:
  the real grip drag and show/hide with a real foreground), `npm run smoke` (all tests
  on the real screen, optional) and live probes. A re-run after a failure asks again.
- Every app run, hidden or visible, holds the one run lock; a second is refused.
- Before a release `npm run smoke:real` runs once on a local build of the commit to be
  tagged ([[rel-07-first-release]]).
- `npm run verify` is `check`, `build`, `build:test-input` and `smoke:hidden`.

## Alternatives
- A test build with hooks in floawty's own code – would ship test code; rejected for
  the shim, which only the test launcher loads.
- Windows Sandbox or a VM – needs features or licences only the maintainer can set up.
- Asking for hidden runs as before – the questions cost more than the runs.

## Consequences
- Agents run app tests as part of their work; the maintainer is asked only for
  visible runs, measurements and live checks.
- The shim and the launcher stay out of release artifacts (`tools/test-input` is its
  own Cargo workspace; the Tauri build does not bundle it).
- Tests that need real input carry `@real`; a tag scan in Vitest enforces it.
