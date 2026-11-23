---
type: plan
tags: [package, tests, process]
status: planned
created: 2026-11-23
updated: 2026-11-23
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
- [ ] Every floawty a test starts goes through the one start function; hidden, it is
      the launcher.
- [ ] Real input lives only in its own module; a spec importing it carries `@real`;
      the scan fails a spec that imports it without the tag, or the reverse.
      `smoke:hidden` runs the app project without `@real` and accepts spec filters.
- [ ] Tests that use the cursor or foreground stay out of `smoke:hidden` until qt-03,
      listed with their reason; `pointAway` in a `finally` is no reason.
- [ ] The on-top hotkey tests press through the launcher and pass hidden while the
      same combination is held on the real desktop.
- [ ] Nothing the test run itself starts opens the maintainer's browser (only floawty
      is shimmed): Playwright's reporter never opens a report, no spec calls the shell.
- [ ] After a restart the test learns the new floawty's pid through the launcher's
      `children` command; hotkeys reach the restarted floawty.
- [ ] Killing npm, Playwright or the launcher leaves no process behind; no floawty
      window appears on the real desktop; no `floawty.log` has "opened outside
      floawty" and the shim's `ShellExecuteW` count matches the expected opens.

## Tests first
- The tag scan (red on today's specs); a hidden hotkey test, red before the helper.

## Checks
- `npm run check`; release build; `smoke:hidden` (asked until qt-04); stop and
  window-watcher checks.

## Resume here
Not started. Starts after qt-01.
