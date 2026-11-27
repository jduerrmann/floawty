---
type: decision
area: ui
tags: [settings, privacy, export]
status: active
created: 2026-11-20
updated: 2026-11-27
source: visual plan "Phase 3 – Release-Pipeline", round 2, chat and advisor review
---

# Settings export carries settings, own tiles and hotkeys, never logins

## Context
The maintainer asked for an export and import to take floawty's setup to another PC,
and whether logins could come along by copying the profile folder.

## Decision
- 0.1.0 gets "Export settings" and "Import settings".
- Format: the same keys and `version` counter as `settings.json`, so one migration
  path, plus a marker key that names the file a floawty settings export, and an
  explicit allow-list of keys.
- Never exported: window geometry (monitor-specific), `lastService` (the last watched
  address), `mode`, `noticeAccepted`, `updateCheck` (consent to contact GitHub stays
  a choice per PC). `graphicsAcceleration` is exported; importing a changed value
  asks for the restart like the switch (maintainer, 2026-11-20).
- Import is strict, not `parse`: marker present, `version` read first and not above
  the current one, any type error rejects; then the settings migration; then only the
  allow-listed keys over the current settings. Hotkeys and own tiles pass the same
  rules as in the panel, enforced in Rust.
- Logins, cookies and every other file of the WebView2 profile stay out. The README
  names the profile folder for a manual backup on the same PC.

## Alternatives
- Export the profile folder too – rejected: WebView2 encrypts cookies with a key bound
  to the Windows account (DPAPI), so they do not work on another PC or account; and
  copying them into a file breaks rule 8 (cookies never leave the machine) and
  principle 7 (never store or transmit credentials).
- Import through `parse` – rejected: it turns any JSON, even `{}`, into defaults.
- No export, copy `settings.json` by hand – less comfortable; the maintainer wants it.

## Consequences
- The hotkey and tile rules exist in Rust as well as TypeScript.
- A new in-scope item for AGENTS.md rule 9, added with the package (rel-05).
- Pinned in rel-05 (2026-11-27): the marker is `"kind": "floawty-settings"`; an
  import applies at once, without a restart, except a changed graphics acceleration,
  which asks for the restart like its switch (maintainer chose live over one restart).
