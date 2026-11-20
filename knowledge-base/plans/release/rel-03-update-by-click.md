---
type: plan
tags: [package, release, dist, ui]
status: planned
created: 2026-11-20
updated: 2026-11-20
source: visual plan "Phase 3 – Release-Pipeline", approved 2026-11-20
---

# rel-03 – Updates by click; portable shows a hint

Plan: [[plan-release]]

## Outcome
The settings show the installed version and "Check for updates"; a found update
installs on click and floawty restarts in the new version. The portable build shows
"X.Y.Z is available" with a button that opens the release page.

## Scope
- Owns: `tauri-plugin-updater` integration (Rust only), an `updates.rs` module, the
  settings panel controls and i18n, the public updater key in `tauri.conf.json`, a
  `scripts/` helper that writes `latest.json` (used by the test harness and rel-06),
  the principle-3 wording (AGENTS.md §2.3, core-principles #3 "Amended by"), README,
  PRIVACY, CHANGELOG and [[tech-bar-and-settings]] lines on updates.
- Non-goals: automatic checks and install on quit (rel-04), the release workflow
  (rel-06), delta updates, channels, a self-replacing portable exe.
- Read first: [[updates-by-tauri-updater]], [[core-principles]] #3, `settings.rs`,
  `settings-panel.ts`, `src/i18n.ts`, `src-tauri/capabilities/main.json`.

## Decided
- `tauri-plugin-updater` approved (2026-11-20), with the `native-tls` backend and no
  default features (SChannel, Windows certificate store); no
  `@tauri-apps/plugin-updater` npm package and no `updater:` permission: floawty's
  own Rust commands only.
- Endpoint: one static URL, `…/releases/latest/download/latest.json`; no
  `{{current_version}}`, `{{target}}`, `{{arch}}`, no custom headers.

## Acceptance criteria
- [ ] Before any request: no traffic to GitHub at start (network log).
- [ ] Click with a newer version available: download, signature check, install,
      restart in the new version.
- [ ] A wrongly signed update is rejected with a hint; the old version keeps running.
- [ ] No network or GitHub down: a short hint, no crash, no retry loop.
- [ ] Portable: the same click shows the version and opens the release page.
- [ ] All added crates carry licences from the rule-5 list; Tauri, wry and tao are
      unchanged in `Cargo.lock`; download size measured, 10 MiB budget holds.
- [ ] README and PRIVACY say: check, download and install from github.com and
      GitHub's download host, only on click or with automatic updates on; GitHub sees
      the IP address.

## Tests first
- Node: the `latest.json` helper on fixtures.
- Harness: a test build with `tauri build --config <test override>` (local endpoint,
  key generated in the run, insecure transport allowed only there), a locally built
  and signed setup, and a local server. No runtime override in the shipped binary.
- Playwright on the test build: click shows the version; portable shows the link.

## Checks
- `npm run verify`, `npm run measure`, network log.

## Open points (do not guess)
- The maintainer generates the updater key pair, keeps key and password in the
  password manager; the code holds only the public key.

## Resume here
Not started; waits for rel-02 (installed/portable decision). Principle-3 amendment
approved by the maintainer on 2026-11-20 (check, download and install).
