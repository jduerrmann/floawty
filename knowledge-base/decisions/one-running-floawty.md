---
type: decision
area: dist
tags: [single-instance, dependency, updates]
status: active
created: 2026-11-27
updated: 2026-11-27
source: visual plan "Release 0.1.0 – der Rest", round 1
---

# Only one floawty runs; a second start brings the open window to the front

## Context
Two running floawtys share one settings file and one WebView2 profile: the last one
to save wins, and a second one with another graphics-acceleration setting cannot
start at all. The installer behind an update closes every `floawty.exe` of the user
without asking (open question 6).

## Decision
- A second start of floawty shows the already running window (restored and in front)
  and ends itself; nothing else changes in the running one.
- Dependency `tauri-plugin-single-instance` (MIT/Apache-2.0), approved by the
  maintainer on 2026-11-27. It brings no further crates: it uses the same
  `windows-sys` 0.61 as floawty (named mutex, `FindWindowW`, `WM_COPYDATA`).
- Built in rel-04, together with the automatic updates.

## Alternatives
- Several floawtys, as before – double writes to the settings, an unexplained failed
  start, and an update that closes the second one without asking.
- Own code with `windows-sys` (about 50 lines) – the same mechanism, but floawty
  would maintain and test it itself.

## Consequences
- App tests start floawty with a fresh profile each; the guard must not block a test
  run while the maintainer's own floawty is running (the mutex name follows the data
  folder, or tests use their own).
- Open question 6 is answered.
