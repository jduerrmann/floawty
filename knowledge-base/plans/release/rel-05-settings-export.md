---
type: plan
tags: [package, release, ui]
status: done
created: 2026-11-20
updated: 2026-11-27
source: visual plan "Phase 3 – Release-Pipeline", approved 2026-11-20; advisor review
---

# rel-05 – Settings move to another PC by file

Plan: [[plan-release]]

## Outcome
"Export settings" writes settings, own tiles and hotkeys into a JSON file the user
picks; "Import settings" reads such a file, checks it strictly and applies the
allowed keys after confirmation. Logins never go into the file
([[settings-export-without-logins]]). Newer settings are never silently lost to an
older floawty.

## Scope
- Owns: export/import commands in Rust, settings panel controls, i18n, tests, the
  settings section of [[tech-bar-and-settings]], forward compatibility in
  `settings.rs` and `persistence.rs`, the README line on backing up the profile by
  hand, the in-scope line of AGENTS.md rule 9, CHANGELOG.
- Non-goals: logins, cookies or any profile file; sync or cloud.
- Read first: [[settings-export-without-logins]], `settings.rs`, `persistence.rs`,
  `src/hotkeys.ts`, `src/custom-tiles.ts`, `service.rs`, [[engineering-standards]] §8.

## Format (pinned in the decision)
Same keys and `version` counter as `settings.json`, plus a marker key; an explicit
allow-list. Never exported: window geometry, `lastService`, `mode`,
`noticeAccepted`, `updateCheck`. `graphicsAcceleration` is exported (maintainer,
2026-11-20), `animations` too (maintainer, 2026-11-22, [[animations-switch]]).

## Acceptance criteria
- [x] Export writes only the allow-listed keys with marker and `version`.
- [x] Import: marker present, `version` read before parsing and not above the
      current one, any type error rejects; then the settings migration; then only the
      allow-listed keys over the current settings. Anything else changes nothing and
      says why (`{}`, foreign JSON, newer version, broken file).
- [x] Import rejects hotkeys without a modifier and tiles that break the panel's
      rules (http(s), dotted host, name ≤ 40, `custom-N` id, never a service id);
      the rules live in Rust too, not only in TypeScript.
- [x] Import never sets the first-start notice or the update consent; a changed
      graphics acceleration asks for the restart like the switch does.
- [x] Cancel in a file dialog changes nothing (code path: cancel returns before
      anything is read or staged; checked by hand by the maintainer, 2026-11-27).
- [x] Saving keeps unknown keys; a `settings.json` with a higher `version` is copied
      aside before it is overwritten (like `.broken`); valid JSON with one wrong type
      no longer resets everything without a copy.

## Tests first
- Rust: allow-list export, strict import (each rejection case), hotkey and tile
  validation, unknown keys kept on save, higher version copied aside.
- Playwright: export → reset → import round trip through commands that return and
  accept text (the native dialog is not driven).

## Decided (visual plan "Release 0.1.0 – der Rest", 2026-11-27)
- File dialogs: `GetSaveFileNameW`/`GetOpenFileNameW` through `windows-sys` (one more
  feature, no new crate). Not `tauri-plugin-dialog`, not the web pickers.
- Import replaces own tiles and hotkeys as a whole; no merging.

- Import applies live (maintainer, 2026-11-27, over one restart); the page reloads
  once after it; a changed graphics acceleration shows the restart question after the
  reload (sessionStorage marker).
- Marker `"kind": "floawty-settings"`; unknown enum words and wrongly shaped values
  are `broken`; missing keys keep the current value, missing fields inside `hotkeys`
  or `shorts` take their defaults.
- Forward compatibility: a new nested key or enum value bumps `version` ([[tech-window]]);
  a newer `settings.json` is copied to `.newer` and saved with only known keys.

## Evidence (2026-11-27)
- Built by `coder` from a brief (three rounds: package, size split, review fixes);
  lead: app spec, docs, the `pending_import` fix after the spec found the confirm
  depended on page state. Lead read the full diff.
- Tests first: Rust (export format, strict import, persistence) and Vitest red then
  green; `tests/settings-transfer.spec.ts` 5 tests, the UI-flow one red before
  `pending_import`.
- `npm run check` green; hidden: transfer spec 5/5, settings spec 6/6, all hidden app
  tests 73/73. A throwaway hidden probe: the export dialog opens (still open after 3 s)
  and the page stays responsive.
- Size: portable 3.93 → 4.02 MiB (dialogs feature, updater `system-proxy` with
  `windows-registry` 0.6.1, MIT/Apache-2.0). Not measured: `npm run measure` (startup
  only reads the settings once more as JSON).
- Independent review by `advisor`, two rounds. Round 1 must-fix: the confirm and the
  restart question did not survive the language reload, and closing the panel left
  stale tiles – fixed (marker + always reload), proven by the UI-flow test. Should-fix
  taken: strict enum words, array-of-object tiles, `.newer` drops `extra`, dialogs in
  `spawn_blocking`, `discard_import`, README path, live opacity asserted. Decided
  instead of code: nested/enum forward compatibility by the version rule; an imported
  hotkey another app holds is logged like at startup. Round 2: no must-fix; open
  should-fix below.

## Resume here
Done on `feat/rel-05-settings-export`. Hand check by the maintainer passed (export,
import with Cancel and OK, Cancel in both dialogs; "passt alles"). Whether Windows
appends the full `.json` itself was not reported; `file_dialog.rs` appends it, at the
cost of no overwrite prompt for a name typed without it. Next package: rel-04.
