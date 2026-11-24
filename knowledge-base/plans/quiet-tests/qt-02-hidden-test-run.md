---
type: plan
tags: [package, tests, process]
status: done
created: 2026-11-23
updated: 2026-11-24
source: re-cut in chat and after two advisor checks, 2026-11-23
---

# qt-02 – Hidden test run

Plan: [[plan-quiet-tests]]

## Outcome
`npm run smoke:hidden` runs every app test that needs no cursor or foreground through
the launcher, the hotkey tests included.

## Scope
- Owns: one start function in `tests/app.ts` used by every spawn (also
  `tests/graphics-acceleration.spec.ts`), `smoke:hidden` in `package.json`, the split
  of `tests/desktop.ts` (shim helpers) from a new real-input module, the `@real` tags,
  the tag scan, the hotkey helper and the on-top hotkey tests.
- Non-goals: cursor and foreground (qt-03); the rule change (qt-04).
- Read first: [[qt-01-test-input-tool]], `tests/app.ts`, `tests/desktop.ts`,
  `tests/debug-port.ts`, `tests/settings.spec.ts`, `tests/graphics-acceleration.spec.ts`.

## Acceptance criteria
- [x] Every floawty a test starts goes through the one start function; hidden, it is
      the launcher (app tests; `tests/measure/` waits for qt-04).
- [x] Real input lives only in its own module; a spec importing it carries `@real`;
      the scan fails a spec that imports it without the tag, or the reverse.
      `smoke:hidden` runs the app project without `@real` and accepts spec filters.
- [x] Tests that use the cursor or foreground stay out of `smoke:hidden` until qt-03,
      listed with their reason; `pointAway` in a `finally` is no reason.
- [x] The on-top hotkey tests press through the launcher and pass hidden while the
      same combination is held on the real desktop.
- [x] Nothing the test run itself starts opens the maintainer's browser (only floawty
      is shimmed): Playwright's reporter never opens a report, no spec calls the shell.
- [x] After a restart the test learns the new floawty's pid through the launcher's
      `children` command; hotkeys reach the restarted floawty.
- [x] Killing npm, Playwright or the launcher leaves no process behind; no floawty
      window appears on the real desktop; no `floawty.log` has "opened outside
      floawty" and the shim's `ShellExecuteW` count matches the expected opens.

## Tests first
- The tag scan (red on today's specs); a hidden hotkey test, red before the helper.

## Checks
- `npm run check`; release build; `smoke:hidden` (asked until qt-04); stop and
  window-watcher checks.

## Excluded from `smoke:hidden` (`@real`, 11 of 48)
- Cursor over floawty (hover bar), qt-03: bar "over a service the bar shows…", "◀ in
  the bar…", "click-through shows the dot…", "a page's suggestion list stays open…".
- Real drag on the grip, qt-04 (grip substitute): bar "the grip in the bar moves…".
- Foreground of another window, qt-03: on-top "show/hide brings a floaty view…",
  sign-in "a sign-in pop-up while floawty is in the background…".
- A real click as the user gesture that lets `window.open` through, qt-03 (where
  measurable): sign-in "a listed sign-in pop-up…", "the window stays on its hosts…",
  "a pop-up of an unlisted host…", "closing the service or hiding floawty…".

## Evidence
- Delegated slice: `coder` (2026-11-23) wrote the split, `startFloawty`, the tags, the
  tag scan, the line parsers, `smoke:hidden` and the on-top hotkey tests from the brief.
- Lead (2026-11-24): read the diff; restart tests now learn the new floawty through
  `app.children()` (launcher `children` hidden, CIM query visible; `stop` ends them);
  the graphics restart test presses a hotkey at the restarted floawty. `parseChildren`
  test red first.
- Independent review (advisor, 2026-11-24): no must-fix. Resolved: the restart hotkey
  raced the registration (`main.rs` logs before `hotkeys::register`) → retried with
  `toPass`; the excluded tests listed above; `smoke:hidden` refuses `--ui`, `--debug`,
  `--headed`, `--reporter`, `--grep-invert`, `--project` and sets
  `PLAYWRIGHT_HTML_OPEN=never`; hidden `stop` bounds `counts` and `quit` too; tag scan
  checks `test.only/skip/fixme/fail`, names hooks that reach real input and reads specs
  recursively (tests red first). Rejected: the "opened outside floawty" error from
  `stop` replacing a test's own failure – both are failures, and the job ends what a
  skipped stop leaves; `tested-exe` import guard – one importer, no drift yet.
- `npm run check` (lead, 2026-11-24): passed; Vitest 132, adapters 161, cargo green.
  Release build and `build:test-input` fresh (2026-11-24).
- First `smoke:hidden` (2026-11-24, maintainer's yes): 36 of 37 green in 1.1 min. A
  watcher on the real desktop saw no floawty window during the run; afterwards no
  floawty, launcher or test WebView2 was left. Red once: settings "the language changes
  both pages and is kept" – Escape left the panel open; its log had no error.
- Re-runs hidden (maintainer's yes): that test 3× and an Escape probe 3× green; a probe
  of 10 language reloads each followed at once by Escape green (panel and floawty's
  `settingsOpen` agreed every time). Suspected cause, not shown: a page reloaded for a
  new language hears state events only after `await listen` in `src/state.ts`. qt-05's
  three green runs watch for it.

- Visible `smoke` (2026-11-24, maintainer's yes): 47 of 48 green, nothing left. Red
  once: bar "fits all nine controls … grows back when wider" (slider stayed 60 px, not
  88), a test qt-02 does not change; re-run alone 3× green. The maintainer saw no bar
  during the run but sees it in normal use: the bar tests read `dataset.visible`, not
  the native webview's visibility (a gap for qt-03 to weigh).
- Held combinations (maintainer's yes): a PowerShell process registered Ctrl+Alt+Shift+T
  and +F on the real desktop (both `True`); `smoke:hidden` of the on-top spec 3/3 green.
- Kills mid-run (full `smoke:hidden`, 5 s after floawty started): the launcher,
  Playwright's main process, npm's tree (`taskkill /T`) – each time no floawty,
  launcher, test WebView2 or Playwright node left after 10 s. No test `floawty.log` has
  "opened outside floawty".

## Resume here
Done; waiting for the maintainer's OK on the commit. Then qt-03.
`tests/measure/budgets.spec.ts` still spawns the exe itself; hidden measurements are qt-04.
