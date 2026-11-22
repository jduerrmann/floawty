---
type: plan
tags: [package, release, ui]
status: ready
created: 2026-11-20
updated: 2026-11-22
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
- [ ] Export writes only the allow-listed keys with marker and `version`.
- [ ] Import: marker present, `version` read before parsing and not above the
      current one, any type error rejects; then the settings migration; then only the
      allow-listed keys over the current settings. Anything else changes nothing and
      says why (`{}`, foreign JSON, newer version, broken file).
- [ ] Import rejects hotkeys without a modifier and tiles that break the panel's
      rules (http(s), dotted host, name ≤ 40, `custom-N` id, never a service id);
      the rules live in Rust too, not only in TypeScript.
- [ ] Import never sets the first-start notice or the update consent; a changed
      graphics acceleration asks for the restart like the switch does.
- [ ] Cancel in a file dialog changes nothing.
- [ ] Saving keeps unknown keys; a `settings.json` with a higher `version` is copied
      aside before it is overwritten (like `.broken`); valid JSON with one wrong type
      no longer resets everything without a copy.

## Tests first
- Rust: allow-list export, strict import (each rejection case), hotkey and tile
  validation, unknown keys kept on save, higher version copied aside.
- Playwright: export → reset → import round trip through commands that return and
  accept text (the native dialog is not driven).

## Open points (do not guess)
- File dialogs: `GetSaveFileNameW`/`GetOpenFileNameW` through `windows-sys`, the web
  file input and save picker in floawty's own page (check availability in WebView2),
  or `tauri-plugin-dialog` (pulls in `tauri-plugin-fs` and `rfd`; new dependency,
  needs OK). Prefer the first two.

## Resume here
Not started. Next: settle the file dialog (prefer no new dependency), then tests for
the strict import.
