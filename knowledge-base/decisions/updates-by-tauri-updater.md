---
type: decision
area: dist
tags: [updates, dependency, privacy]
status: active
created: 2026-11-20
updated: 2026-11-27
source: visual plan "Phase 3 – Release-Pipeline", rounds 1–2
---

# Updates install by click or automatically on quit, through tauri-plugin-updater

## Context
Principle 3 allows floawty to contact GitHub Releases only for an update check the
user triggers or turns on. The maintainer wants updates as comfortable as possible:
automatic if wished, and by hand.

## Decision
- Dependency `tauri-plugin-updater` (MIT/Apache-2.0), approved by the maintainer on
  2026-11-20, with the `native-tls` backend and no default features (SChannel,
  Windows certificate store, smallest). Used from floawty's own Rust commands only:
  no npm package, no `updater:` capability.
- One static endpoint, `latest.json` of the latest GitHub release; no version, target
  or arch placeholders, no custom headers.
- The settings show the installed version and "Check for updates"; a found update
  installs on click and floawty restarts.
- "Update automatically" is off by default (the stored `updateCheck` field). When on:
  a check at start and every 24 h, download in the background, install in passive
  mode when the user quits floawty (not on its own restarts, not at shutdown); never
  during playback. After an install on quit floawty stays closed; the next start runs
  the new version (maintainer, 2026-11-27: `restart_after_install(false)`).
- The portable build cannot update itself: the same check shows the new version and
  opens the release page.
- Updates are signed with an updater key; the private key and its password live in
  the maintainer's password manager and as GitHub secrets, the public key in
  `tauri.conf.json`.

## Alternatives
- Hint with a link only, own small HTTP request – less comfortable; rejected by the
  maintainer's wish for automatic updates.
- Only a link to the release page, no request at all – no automatic check, which
  README and PRIVACY promise.
- Install at once when found – interrupts the video.
- Portable replaces its own exe – own swap code, fails in read-only folders.

## Consequences
- Losing the updater key or its password ends updates for every installed copy; only
  a reinstall helps. Keep a backup.
- The download grows by the plugin's HTTP client; the README names the measured size
  (budget 10 MiB, [[stack-by-spike]]).
- PRIVACY and README describe check, download and install from github.com and
  GitHub's download host; GitHub sees the IP address.
- Principle 3 covered an update check only. The maintainer approved (2026-11-20)
  amending it to "check, download and install from GitHub Releases, only on click or
  with automatic updates on"; rel-03 changes AGENTS.md §2.3 and core-principles #3.
- The installer closes every running `floawty.exe` of the user; only one floawty
  runs ([[one-running-floawty]]).
