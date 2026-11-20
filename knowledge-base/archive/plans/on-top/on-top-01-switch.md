---
type: plan
tags: [package, window, bar, hotkeys, settings]
status: done
created: 2026-11-20
updated: 2026-11-20
source: visual plan "Immer im Vordergrund – Schalter", round 1, answered 2026-11-20
---

# on-top-01 – Always on top can be switched off

Plan: [[plan-on-top]]

## Outcome
A bar button 🖈 and a configurable hotkey (default Ctrl+Alt+Shift+T) switch the floaty
view's "always on top" off and on; the choice is stored in settings.json.

## Decided (visual plan, 2026-11-20)
- Stored: `alwaysOnTop` in settings.json, default `true`; a restart keeps it.
- Only the floaty view. Window mode stays a normal window; there the button is
  disabled and the hotkey does nothing. The switch keeps its state across mode changes.
- Click-through keeps floawty on top while it is on; afterwards the switch applies
  again. The click-through hotkey is unchanged.
- Button 🖈 (U+1F588, monochrome) right after click-through; tooltip "Always on top" /
  „Immer im Vordergrund", `aria-pressed` = on. No extra marker while it is off.
- Hotkey action `alwaysOnTop`, default Ctrl+Alt+Shift+T, changeable in the settings.
- Ctrl+Alt+Shift+O (show/hide): with the switch off in the floaty view and floawty not
  the active window, it brings floawty to the front instead of hiding it.
- Confirmed facts: a covered floawty stays reachable via taskbar and Alt+Tab;
  switching off takes effect when another window is activated (`HWND_NOTOPMOST`).

## Scope
- Owns: `src-tauri/src/{settings,mode,overlay,hotkeys,commands,main}.rs`,
  `src/{bar.html,bar.ts,hotkeys.ts,hotkey-list.ts,i18n.ts,state.ts}`,
  `tests/on-top.spec.ts`, `tests/desktop.ts`, notes [[tech-window]],
  [[tech-bar-and-settings]], decision [[always-on-top-switch]], CHANGELOG.
- Non-goals: on top in window mode; a marker while off; service adapters; the
  settings export allow-list (rel-05 decides whether `alwaysOnTop` is exported).
- Read first: [[tech-window]], [[tech-bar-and-settings]], `overlay.rs`, `hotkeys.rs`.

## Acceptance criteria
- [x] Fresh start: floaty view is topmost, 🖈 pressed.
- [x] 🖈 or Ctrl+Alt+Shift+T: not topmost, 🖈 not pressed, `"alwaysOnTop": false` saved;
      again: topmost.
- [x] A restart with `alwaysOnTop: false` opens the floaty view not topmost; an old
      file without the field opens topmost.
- [x] Click-through on while off → topmost; click-through off → not topmost again.
- [x] Window mode: never topmost, 🖈 disabled, the hotkey changes nothing; back in the
      floaty view the switch's state applies.
- [x] Ctrl+Alt+Shift+O with the switch off and another window active brings floawty
      to the front; pressed again (floawty active) it hides. With the switch on it
      hides as before.
- [x] Hotkey listed in the settings (EN/DE), changeable, conflicts shown; a hotkey
      taken by another app is logged, never fatal.
- [x] Maintainer tried it live.

## Tests first
- Rust `settings`: old file → `alwaysOnTop` true and hotkey Ctrl+Alt+Shift+T; round trip of false.
- Rust `mode`: `stays_on_top` for floaty/window × switch × click-through;
  `show_hide_step` (hide, show, raise).
- Rust `hotkeys`: action name `alwaysOnTop` finds its slot (existing table test).
- Vitest: i18n parity covers the new keys (existing test).
- Playwright `tests/on-top.spec.ts`: button, hotkey, restart, click-through, window
  mode, show/hide hotkey with another window active (WS_EX_TOPMOST read by Win32).

## Checks
- `npm run verify`; `npm run measure` not needed (no polling, startup unchanged:
  one more `SetWindowPos` flag) – state the reason in the evidence.

## Evidence (2026-11-20)
- Tests first: Rust `settings` (old file, round trip), `mode` (`stays_on_top`,
  `show_hide_step`), `hotkeys` (action name) compiled against stubs and failed on their
  asserts (6 red), then green. Opacity clamp and steps moved to `opacity.rs` so
  `settings.rs` stays under 400 lines (393).
- Playwright `tests/on-top.spec.ts` (4 tests): button with a real click, opacity kept
  (alpha 128 at 50 %), hotkey, restart, click-through, window mode, show/hide with
  another app's window active and with floawty minimized. Helpers find floawty's window
  by process and title (Get-Process's `MainWindowHandle` names another window once
  the main one is hidden) and fail when it is missing.
- Minimize fix red first: a build without `unminimize` failed the spec at
  "minimized: false, foreground: true", the build with it passed.
- First `npm run verify` found a real failure: nine compact bar buttons need 248 px,
  232 available at the 240 px minimum; compact buttons are now 20 px (230 px).
- One full Playwright run overlapped with another session's smoke run on port 9334
  and counts as invalid; a later clean run had one hover failure that did not repeat
  (bar spec 9/9, next full run 97/97).
- Final `npm run verify` green: Vitest 68, cargo 113, clippy, build, Playwright 97.
- `npm run measure`: 3.3 MiB, start 47 ms, idle 235 MB / 0 %, YouTube 1080p 718 MB /
  0.29 % CPU at 61 fps, hidden 717 MB / 0 %; idle network one Microsoft host
  (2620:1ec:33::11), as before. All budgets met.
- After verify, the spec also asserts the opacity after restoring from minimized
  (alpha 128); it passed against the same build, so no code change (4/4).
- Review: `advisor` (Fable 5.2), no blocker. Minimized floaty view made show/hide a
  dead key → `unminimize` before `set_focus`, test added; `settings.rs` at 401 lines
  → `opacity.rs` split, original tests restored; test depended on the desktop → test
  window topmost, longer first poll, `test.slow()`; owned dialogs → `is_active` uses
  `GA_ROOTOWNER`; opacity, real click, missing-window gaps → covered; CHANGELOG
  wording, opacity invariant, decision consequences (hotkey during click-through,
  Ctrl+Alt+Shift+T already taken) → fixed. Kept as decided: `mode` in
  `show_hide_step` (window mode keeps hiding).

- Maintainer tried it live (2026-11-20): OK.

## Resume here
Done 2026-11-20 and archived.
