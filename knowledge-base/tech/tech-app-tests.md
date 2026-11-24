---
type: tech
area: process
tags: [tests, playwright, test-input, measurement]
status: active
created: 2026-11-24
updated: 2026-11-24
source: plan [[plan-quiet-tests]]
---

# App tests on a hidden desktop

Playwright drives the release `floawty.exe` over WebView2's debug port (9334). App
tests and measurements run on a Windows desktop nobody sees, through the test tool in
`tools/test-input` (its own Cargo workspace: `launcher`, `shim`, `shared`), so they
take neither the maintainer's mouse, keyboard nor screen. Rules: AGENTS.md rule 10,
[[app-tests-run-hidden]].

## Invariants
- Nothing from a hidden run reaches the real desktop: floawty's hotkeys, `SendInput`,
  `ShellExecuteW` (browser opens), cursor, mouse buttons and foreground are answered
  by the shim; WebView2's own processes stay unpatched.
- The shim loads only into a floawty the launcher started on a `floawty-test-*`
  desktop; floawty resumes only after a complete handshake; restarted floawtys get
  the shim or are ended.
- One app run at a time: `test-input run` (hidden or `--visible`) holds the mutex
  `Global\floawty-app-tests`, puts everything in a kill-on-close job with a timeout,
  and sets `FLOAWTY_TEST_RUN`; `startFloawty` refuses to start without it.
- floawty's own code has no test hook; release artifacts contain neither launcher
  nor shim (checked by rel-06).

## Structure
- **Scripts** (`scripts/app-run.mjs`, plan in `app-run-plan.mjs`):
  `smoke:hidden` (app project without `@real`, spec filters allowed),
  `smoke:real` (only `@real`, visible), `smoke` (all, visible, optional),
  `measure` (hidden, `tests/measure/`); `verify` = check, build, `build:test-input`,
  `smoke:hidden`. Flags that open windows, change the reporter, project or config, or
  bring `@real` back are refused.
- **Launcher** `test-input run [--visible] [--timeout-s N] -- cmd` and
  `test-input floawty [--report-start] <exe>`: line protocol on stdin/stdout – first
  line `pid N` (with `--report-start` then `started MS`), commands `hotkey`, `hold`,
  `release`, `cursor X Y|none`, `button left|right down|up`,
  `foreground main|sign-in|other|none`, `counts` (`send_input`, `shell_execute`,
  `drag`), `children`, `quit`; every command gets one `ok …` or `error …`.
- **Shim** patches floawty.exe's import table (11 hooks): `RegisterHotKey`,
  `UnregisterHotKey` (a run-wide table, refused like Windows refuses duplicates),
  `SendInput`, `ShellExecuteW` (swallowed, counted), `CreateProcessW` (restarts get
  the shim), `GetCursorPos` (unset: access denied), `GetAsyncKeyState` (mouse buttons
  only), `GetForegroundWindow`, `GetGUIThreadInfo`, `SetForegroundWindow` (granted
  while floawty is in front or once after its own input), `PostMessageW`
  (`WM_NCLBUTTONDOWN`/`HTCAPTION` swallowed and counted as a drag request).
- **Tests side**: every start goes through `startFloawty` / `launch()` in
  `tests/app.ts`; `RunningApp` offers `hotkey`, `point`, `pointAway`, `click`,
  `press`, `release`, `foreground`, `children`, `counts` – hidden through the launcher
  (`tests/app-input.ts`), visible through real input (`visibleInput` in
  `tests/real-input.ts`). A spec that imports `tests/real-input.ts` itself carries
  `@real`; the tag scan (`tests/tag-scan.ts`, in Vitest) fails a mismatch. The `@real`
  set: the real grip drag and show/hide with a real foreground (about 13 s).
- **Measurements** (`tests/measure/budgets.spec.ts`): hidden, medians over 60 s with
  `spikes/measure`; start time from the launcher to floawty's main window without
  the time it is held for the shim ([[start-budget-main-window]]); hover scenarios
  move the mouse over CDP. Hidden and on-screen values agree (qt-04 calibration).

## Behaviour of a hidden WebView2
- Pages report `visibilityState` visible; video plays 1080p at 60 fps.
- A page sees the mouse only through CDP; the shim's cursor is what floawty's shell
  sees. A hidden click sets both and proves it reached the page.
- Right after a page reloads (new language) CDP key events are dropped for a moment;
  wait until a neutral key arrives before the key that matters.
- `GetCursorPos` and `GetForegroundWindow` fail or return nothing off the input
  desktop; the shim answers them.

## Working on X → read Y
- New app test → `tests/app.ts`, `tests/app-input.ts`, engineering standards §2
- Test needs the real screen → `@real`, `tests/real-input.ts`, [[app-tests-run-hidden]]
- Shim or launcher → `tools/test-input/`, [[isolated-test-input]],
  archived plan [[plan-quiet-tests]]
- Measuring → `tests/measure/`, engineering standards §7, [[start-budget-main-window]]
