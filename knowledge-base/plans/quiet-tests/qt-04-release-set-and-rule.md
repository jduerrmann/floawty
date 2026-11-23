---
type: plan
tags: [package, tests, process]
status: planned
created: 2026-11-23
updated: 2026-11-23
source: re-cut in chat and after two advisor checks, 2026-11-23
---

# qt-04 – Grip substitute, short real release set, rule 10

Plan: [[plan-quiet-tests]]

## Outcome
No package test needs the real screen; a short real set runs before releases; agents
start hidden runs without asking.

## Scope
- Owns: the grip substitute test, `smoke:real`, the meaning of `smoke` and `verify`
  in `package.json`, AGENTS.md rule 10, [[engineering-standards]] §2, a new decision
  superseding parts of [[app-tests-ask-first]] and [[app-runs-smallest-first]],
  `.claude/settings.json` (allow `npm run smoke:hidden` with spec filters), the release
  step in [[rel-06-release-workflow]] or [[rel-07-first-release]].
- Non-goals: shim changes beyond what the substitute needs.
- Read first: [[qt-03-cursor-and-foreground]], [[app-tests-ask-first]],
  [[app-runs-smallest-first]], `tests/measure/`.

## Acceptance criteria
- [ ] The grip test checks hidden that the drag was requested and that floawty
      settles the window after a test button release; the real drag is `@real`.
- [ ] `@real` holds only what real input alone can show, together well under a
      minute, measured.
- [ ] `verify` is check + build + `smoke:hidden`; `smoke` is removed or defined.
- [ ] Rule 10: a hidden run is `npm run smoke:hidden` with optional spec filters; it
      starts without a question and is announced; `smoke:real`, `measure` and live
      probes keep asking; one app run at a time; `smoke:real` runs on a local build
      of the commit to be tagged; measurements run hidden like `smoke:hidden`.
- [ ] Measurements run hidden; a change is compared with its predecessor build measured
      hidden the same way (maintainer, 2026-11-23); old on-screen numbers are not
      compared with hidden ones.
- [ ] Release artifacts contain neither the shim nor the launcher (checked).

## Checks
- `npm run check`; `smoke:hidden`; `smoke:real` once (asked), with its duration.

## Resume here
Not started. Starts after qt-03.
