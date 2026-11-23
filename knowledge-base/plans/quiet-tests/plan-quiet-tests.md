---
type: plan
tags: [plan-map, tests, process]
status: active
created: 2026-11-23
updated: 2026-11-23
source: visual plan "Testen ohne deinen Bildschirm", rounds 1–4, approved in chat 2026-11-23; re-cut in chat the same day
---

# Plan – App tests without the maintainer's screen

## Outcome
Every app test of a package runs on a hidden Windows desktop against the unchanged
release `floawty.exe`; no test takes over the maintainer's mouse, keyboard, focus or
screen. Before a release only a few real-input checks of about 30 s remain.
Planning page: `.claude/plans/testen-ohne-bildschirm.md`. Research:
[[isolated-test-input]].

## Decided (2026-11-23, in chat)
- Local only: no push, restart, installation, admin rights, VM, Sandbox or licence.
- Way: a test shim DLL loaded only into the tested exe on the hidden desktop
  ([[isolated-test-input]] option 1). floawty's own code gets no test hook; the
  Cargo-feature test build is dropped.
- Per package no test moves the maintainer's mouse; the grip drag gets a substitute
  test one level lower.
- Before a release only what really needs real input, well under a minute (not the
  full 48); `npm run smoke` stays available but is no longer required.
- Hidden runs start without a question and are announced, once the rule says so
  (qt-03); until then each run is asked for. One app run at a time.
- A test input that cannot reach floawty fails with its cause, never silently.

## Found so far
- Hidden desktop (`CreateDesktopW`, never switched to), Playwright started there in a
  kill-on-close job: floawty inherits it; 29/29 tests without real input green in 50 s.
- `RegisterHotKey` is session-wide: a test floawty collides with the maintainer's
  real one in both orders. `PostMessage` reaches the hidden desktop only from a
  process on it.
- tao's `set_focus` sends a real Alt press via `SendInput` when `SetForegroundWindow`
  fails, which it always does on the hidden desktop; whether it leaks is unmeasured.
- Off-domain links call `ShellExecuteW` (`src-tauri/src/service.rs`): a hidden run
  could open the maintainer's browser.
- The shim works on the release `floawty.exe` (proof in [[qt-01-test-input-tool]]):
  7 imports patched, a shim hotkey toggles always on top, the real combination
  stays free, nothing left over, no Defender detection.
- Measurements run hidden, compared with the predecessor build measured hidden
  (maintainer, 2026-11-23).

## Packages

| # | Package | Outcome | Depends on |
|---|---|---|---|
| 01 | [[qt-01-test-input-tool]] | Launcher and shim: hidden desktop, job, mutex, timeout, handshake, restart children; hotkeys, `SendInput` and browser starts stay in the shim; proven against floawty first | – |
| 02 | [[qt-02-hidden-test-run]] | `npm run smoke:hidden`: one start function, real input in its own module with `@real`, tag scan, hotkey tests hidden | 01 |
| 03 | [[qt-03-cursor-and-foreground]] | Cursor, named foreground states and buttons from the test; hover-bar tests hidden, sign-in where measurable | 02 |
| 04 | [[qt-04-release-set-and-rule]] | Grip substitute, short `@real` release set, `verify` and rule 10 | 03 |
| 05 | [[qt-05-three-green-runs]] | Three green hidden runs; gl-05 closed; independent review of the plan | 04 |

Packages run in order; they share `tests/desktop.ts`, `tests/app.ts` and the shim.

## Advisor checks (2026-11-23)
- First check (Cargo-feature design): hotkeys session-wide, browser opens, release
  gate, narrow "hidden run", mutex, timeout, orphans, split the rule change.
- Second check (shim design): restart children and direct spawns ran without the
  shim; a failed injection must never resume; prove the shim on floawty before the
  tool; protocol with replies and a queued hotkey; prevent `ShellExecuteW`, not only
  detect it; fakes must refuse like Windows (duplicate hotkeys, foreground); real
  input in its own module for the tag scan; `verify` and measurements in rule 10.
  All folded into qt-01..05; measurements are an open point in qt-04.
