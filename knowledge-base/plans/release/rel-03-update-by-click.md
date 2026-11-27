---
type: plan
tags: [package, release, dist, ui]
status: in-progress
created: 2026-11-20
updated: 2026-11-27
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
- [x] Before any request: no traffic to GitHub at start. Proven on the update-test
      build: the local endpoint gets no request of any kind before the click. A network
      log of the real build was not taken.
- [x] Click with a newer version available: download, signature check, install,
      restart in the new version. Proven up to the start of the setup: byte-identical
      saved setup, one `ShellExecuteW`, floawty exits. Passive mode, the started file
      and the restart into the new version are proven by rel-07 (rc.1 → rc.2 by click).
- [x] A wrongly signed update is rejected with a hint; the old version keeps running
      (signature over other bytes, and one bound to another version).
- [x] No network or GitHub down: a short hint, no crash, no retry loop (dropped
      connection: one request; 503: "no update information").
- [x] Portable: the same click shows the version and opens the release page (one
      swallowed `ShellExecuteW`).
- [x] All added crates carry licences from the rule-5 list; Tauri, wry and tao are
      unchanged in `Cargo.lock`; download size measured, 10 MiB budget holds.
- [x] README and PRIVACY say: check, download and install from github.com and
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

- The harness signs with a throwaway key generated in the run; the maintainer
  generates the real key pair in rel-06 (visual plan "Release 0.1.0 – der Rest",
  2026-11-27). Until then `plugins.updater.pubkey` is empty, which rejects every
  update; rel-06 fails on an empty key.
- `requireSignedVersion` is on from the first release: a signature must carry the
  version the manifest announces (`tauri signer sign --app-version`).
- Timeouts: connect 10 s, read 30 s (also for the download, plugin `configure_client`),
  check 30 s.
- System proxy: off (`default-features = false` drops `system-proxy`); open question
  for the maintainer.

## Evidence (2026-11-27)
- Plan check by `advisor` before building: shim swallows `ShellExecuteW` (tests
  assert counts and the setup saved in their own `TEMP`), timeouts, offline test with
  a dropping server, `requireSignedVersion`, empty pubkey. All taken over.
- Slice 1 (shell and UI) by `coder` from a brief; harness, specs, scripts and docs by
  the lead. Lead read the full diff.
- Tests first: `latest.json` helper and update-view red then green; the app spec was
  written before the code but not run red.
- `npm run check` green. Hidden: `tests/update.spec.ts` 7/7, `tests/sign-in.spec.ts`
  5/5, then all hidden app tests 68/68.
- Size: portable 3.33 → 3.93 MiB, setup 1.20 → 1.42 MiB (budget 10 MiB). New crates
  (Windows): tauri-plugin-updater, minisign-verify, native-tls, schannel, hyper-tls,
  tokio-native-tls, tempfile, zeroize, rustls-pki-types – MIT and/or Apache-2.0.
- Independent review by `advisor`: no must-fix. Resolved: download timeout confirmed
  in the plugin source (`configure_client` applies to `download`); fixtures and a test
  for a signature bound to another version; rel-06 criteria for `--app-version` and
  the empty-key gate; criterion 2 ticked with its limit; hidden runs refuse a stale
  update-test build and only hidden runs need it; rule 10 names
  `build:update-test`; a new check clears the old found update; the version label is
  asserted; README names the download host and the IP address; the local server
  counts every request and reports a busy port. Not changed: the sign-in window's
  `plugin:updater|check` entry stays (cheap, and `open_release_page` there proves the
  refusal); classified failures log only their code (no URLs or hosts in the log).

## Resume here
Code final and reviewed on `feat/rel-03-update-by-click` (not committed). Waiting for:
the maintainer's yes to `npm run measure` (startup gained a plugin), the answer on
the system proxy, and the OK on the commit. Next package: rel-05.
