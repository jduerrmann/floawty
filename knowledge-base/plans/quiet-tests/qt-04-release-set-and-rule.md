---
type: plan
tags: [package, tests, process]
status: done
created: 2026-11-23
updated: 2026-11-24
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
- [x] The grip test checks hidden that the drag was requested and that floawty
      settles the window after a test button release; the real drag is `@real`.
- [x] `@real` holds only what real input alone can show, together well under a
      minute, measured.
- [x] `verify` is check + build + `smoke:hidden`; `smoke` is removed or defined.
- [x] Rule 10: a hidden run is `npm run smoke:hidden` with optional spec filters; it
      starts without a question and is announced; `smoke:real`, `measure` and live
      probes keep asking; one app run at a time; `smoke:real` runs on a local build
      of the commit to be tagged; measurements run hidden like `smoke:hidden`.
- [x] Measurements run hidden; a change is compared with its predecessor build measured
      hidden the same way (maintainer, 2026-11-23); old on-screen numbers are not
      compared with hidden ones.
- [x] Release artifacts contain neither the shim nor the launcher (checked).

## Checks
- `npm run check`; `smoke:hidden`; `smoke:real` once (asked), with its duration.

## Changed in work
- `.claude/settings.json` (allow `smoke:hidden` with filters) is left to the
  maintainer: a permission change is theirs to make.
- Release artifacts: today's build output is `floawty.exe` alone and
  `tauri.conf.json` bundles nothing from `tools/test-input`; the check of the
  installer and portable contents moved into rel-06's criteria.
- Start time: from before floawty's process exists to its visible main window, minus
  the time floawty is held for the shim (maintainer, 2026-11-24). The old method timed
  a 16 × 16 helper window (visible after ~31 ms); the main window shows after ~250 ms
  warm, so the budget is 400 ms ([[start-budget-main-window]], maintainer).
- Hover scenarios measure over the debug port: a hidden page sees the mouse only
  through CDP (maintainer, 2026-11-24).

## Evidence
- Probe (lead): on the hidden desktop the test video plays 1080p at 60.0 fps,
  `visibilityState` visible – measurements can run hidden.
- Delegated slice: `coder` built the shim hook, `run --visible`, the start report,
  the runner and the hidden measurement; Rust and Vitest tests red first. The lead
  wrote rule 10, CLAUDE.md, [[app-tests-run-hidden]], engineering standards §2,
  rel-06/07.
- First full `smoke:hidden`: 46 of 47, the new grip test green; red once: on-top
  "window mode is never on top" (the bar's `#on-top` still enabled after
  `toggle_mode` right after launch), 3/3 alone and 16/16 as a pair afterwards;
  suspected startup race in `src/state.ts` (state fetched before `listen`), proposed
  as its own task.
- Independent review (advisor, 2026-11-24): no must-fix. Fixed: start clock from
  process creation (S1, maintainer's choice); rule 10 says live probes ask even when
  hidden and app tests start only through the scripts; the runner refuses `-c` and
  `--config` everywhere and short greps like long ones (tests red first); §2 allows
  a fixed wait only to show that something does not happen; decision numbers and the
  `verify` line; rel-06 lists the artifact contents. S2 (hidden vs on-screen numbers):
  a calibration run. S4: recorded above.
- `npm run check` (lead): passed; full `smoke:hidden` after the fixes: 47 of 47.
- Calibration, same build (maintainer's yes). Visible with the old spec: start 49 ms
  (helper window), after hover 251.7 MB, hover with animations off 215.8 MB, YouTube
  1080p 728.1 MB / 0.34 % / 61.3 fps, hidden 715.3 MB; idle aborted (no samples).
  Hidden with the new spec: idle 214.5 MB, YouTube 725.1 MB / 0.34 % / 61.2 fps,
  hidden 716.8 MB / 0 %; after the hover fix 246.4 MB and 223.7 MB; start 257 ms
  (median of 5) to the main window. Hidden and visible agree except the old start.
- `smoke:real` (maintainer's yes): 2 of 2 in 12.7 s (14 s wall): the real grip drag
  and on-top show/hide; nothing left.
- Final: `npm run check` passed (Vitest 152); `smoke:hidden` 47 of 47.

## Resume here
Done; waiting for the maintainer's OK on the commit. Then qt-05 (three green hidden
runs, gl-05 closed, plan review).
