---
type: plan
tags: [package, tests, window]
status: done
created: 2026-11-23
updated: 2026-11-24
source: re-cut in chat and after two advisor checks, 2026-11-23
---

# qt-03 – Cursor, foreground and buttons from the test

Plan: [[plan-quiet-tests]]

## Outcome
The shim answers floawty's cursor, foreground and mouse-button reads with the state a
test sets, so the hover-bar tests and as many sign-in tests as possible run hidden.

## Scope
- Owns: the shim's `GetCursorPos`, `GetForegroundWindow`, `GetGUIThreadInfo`,
  `GetAsyncKeyState` (mouse buttons only) and `SetForegroundWindow`; the shim helpers
  for pointing, clicking and "another window in front"; the tests that move hidden.
- Non-goals: the grip drag (qt-04); `WindowFromPoint`, `GetAncestor`, `IsChild` stay
  real; WebView2's own processes stay unpatched.
- Read first: [[qt-02-hidden-test-run]], [[tech-window]], `src-tauri/src/bar.rs`
  (`look`, `bar_has_keys`), `src-tauri/src/overlay.rs` (`in_front`, `is_active`,
  `toggle_visible`), `src-tauri/src/sign_in_window.rs`.

## Acceptance criteria
- [x] Foreground is a named state (main, sign-in, other, none; no "bar", see below) with focus
      derived from it; impossible combinations are refused. Unset cursor fails, like
      the hidden desktop.
- [x] `SetForegroundWindow` answers as Windows would for the state; it is not always
      granted, so tao's fallback path stays visible. The real foreground case
      (`tests/on-top.spec.ts` show/hide in the background) goes to `@real`.
- [x] A click sets cursor and button state and clicks the page over CDP; a click that
      does not reach the page fails with its cause.
- [x] Hover-bar tests pass hidden. Sign-in and suggestion-list tests pass hidden or
      stay `@real` with the measured reason.

## Tests first
- Rust tests for the state answers; one hover test hidden, red before the cursor fake.

## Checks
- `npm run check`; release build; `smoke:hidden`.

## Changed in work
- No "bar" foreground state (criterion 1): no test needs the bar to hold the keys, so
  `GetGUIThreadInfo` puts focus in the window in front; added when a test needs it.
  `bar_has_keys`' true path is therefore not testable hidden.
- The red hover run before the cursor fake was not run (the fake and the test came in
  one slice); the hidden runs of qt-02 had the hover tests excluded for that reason.

## Evidence
- Delegated slice: `coder` (2026-11-24) built state, protocol, hooks, test helpers and
  moved the tests; Rust tests red first except the pure answers in `input.rs`.
- Lead: visible `stop` moves the real cursor away when a test moved it (the `finally`
  `pointAway` calls are gone).
- First full `smoke:hidden`: 45 of 46 green; every moved test (hover bar, ◀,
  click-through, suggestion list, five sign-in tests) passed hidden. Red: settings "the
  language changes…". Reproduced 4/4 with a probe: right after the language reload a
  hidden WebView2 drops CDP key events (no `keydown` reached the page, floawty's
  `settingsOpen` stayed true); 2 s later 4/4 arrive. Visible runs never showed it.
  The test now waits until a neutral key (Shift) arrives, then presses Escape once.
- Second full run: 45 of 46; red: bar "fits all nine controls…" (slider 60, not 88),
  the same pre-existing flake as qt-02's visible run, 1 in 4 after "the service follows
  the window size…", 0 of 3 alone. Not a qt-03 change; own task "Bar-Regler bleibt
  nach Vergrößern kompakt".
- Independent review (advisor, 2026-11-24): no must-fix. Fixed: titles read with
  `InternalGetWindowText` (no window message from hook context) and only for visible
  windows; a foreground the test sets clears floawty's earlier sent input (test red
  first); the Escape retry replaced by the Shift wait; `input.stop()` inside `stop`'s
  `try`; visible `foreground('other')` counts as a cursor move; `windowRect` throws for
  a hidden window; header and page-choice limits documented; click unit tests
  (`tests/app-input.test.ts`, incl. the failure naming point and page). Left: no app
  test reads the swallowed `SendInput` count, so tao's fallback is shown unit-level only.
- `npm run check` (lead): passed; Vitest 138, adapters 161, cargo green; test-input
  clippy and fmt clean.
- Full `smoke:hidden` after the fixes (2026-11-24): 46 of 46 green in 1.4 min, nothing
  left; the second-floawty test logs its expected WebView2 error.
- Visible `smoke` (maintainer's yes): 42 of 48; the 6 red collided with another
  session's hidden run on debug port 9334 (5× "port still taken", one sign-in pop-up
  missing). Rerun of those 6 with the run lock held by a placeholder: 6/6 green, nothing
  left. Gap for qt-04: the run lock covers hidden runs only, not a visible one.

## Resume here
Built (2026-11-24, `coder`), reviewed; see Evidence:
- Shared state `Input` (cursor, left and right button, foreground main / sign-in /
  other / none, "floawty sent input" flag) in the locked block, `STATE_VERSION` 2;
  zero is the start state (no cursor, buttons up, foreground main). Pure answers in
  `tools/test-input/shared/src/input.rs`; window lookup in `windows.rs`.
- Protocol `cursor X Y|none`, `button left|right down|up`, `foreground
  main|sign-in|other|none`; the launcher refuses `main` while no visible window titled
  "floawty" exists and `sign-in` while main owns no visible window titled "floawty …"
  (a page pop-up has no title, so it is not one).
- Five more shim hooks (10 in all): `GetCursorPos` (unset: FALSE, `ERROR_ACCESS_DENIED`,
  as the real call gives on the hidden desktop, measured), `GetAsyncKeyState` (mouse
  buttons only), `GetForegroundWindow`, `GetGUIThreadInfo(0, …)` (active = focus =
  window in front, never the bar), `SetForegroundWindow` (granted while floawty is in
  front, or once after floawty sent input; tao tries it first, then the Alt press).
- Tests: `app.point`, `pointAway`, `click`, `foreground` (`tests/app-input.ts`; visible
  runs use `visibleInput` in `tests/real-input.ts`). Hover-bar tests, the suggestion
  list and all five sign-in tests no longer carry `@real`; the grip (qt-04) and on-top
  show/hide in the background stay `@real`.
Done; waiting for the maintainer's OK on the commit. Then qt-04.
`tests/measure/budgets.spec.ts` still spawns the exe itself; hidden measurements are qt-04.
