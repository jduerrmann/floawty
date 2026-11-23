---
type: plan
tags: [package, tests, window]
status: planned
created: 2026-11-23
updated: 2026-11-23
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
- [ ] Foreground is a named state (main, bar, sign-in, other, none) with focus
      derived from it; impossible combinations are refused. Unset cursor fails, like
      the hidden desktop.
- [ ] `SetForegroundWindow` answers as Windows would for the state; it is not always
      granted, so tao's fallback path stays visible. The real foreground case
      (`tests/on-top.spec.ts` show/hide in the background) goes to `@real`.
- [ ] A click sets cursor and button state and clicks the page over CDP; a click that
      does not reach the page fails with its cause.
- [ ] Hover-bar tests pass hidden. Sign-in and suggestion-list tests pass hidden or
      stay `@real` with the measured reason.

## Tests first
- Rust tests for the state answers; one hover test hidden, red before the cursor fake.

## Checks
- `npm run check`; release build; `smoke:hidden`.

## Resume here
Not started. Starts after qt-02.
