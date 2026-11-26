---
type: plan
tags: [package, release, dist, window]
status: done
created: 2026-11-20
updated: 2026-11-26
source: visual plan "Phase 3 – Release-Pipeline", approved 2026-11-20
---

# rel-02 – Installer and portable build start without admin rights

Plan: [[plan-release]]

## Outcome
`npm run build:release` writes `floawty-X.Y.Z-setup.exe` (NSIS, current user,
English and German, downloads WebView2 if missing) and `floawty-X.Y.Z-portable.exe`
to the root `release\` folder; both start without admin rights and share the same
user folders. Without WebView2 the portable build shows a message with a link
instead of failing silently.

## Scope
- Owns: `src-tauri/tauri.conf.json` bundle section (incl. `publisher`), NSIS
  installer hooks, a release build script under `scripts/`, the WebView2 presence
  check (small module called from `main.rs`) and the installed/portable decision,
  tests, a new `tech/tech-distribution.md` with its `INDEX.md` hook line, CHANGELOG.
- Non-goals: signing, updater (rel-03), release workflow (rel-06), MSI, ARM64.
- Read first: [[release-pipeline]], [[stack-by-spike]], `src-tauri/src/main.rs`,
  `paths.rs`, Tauri NSIS config (`installMode`, `languages`, `webviewInstallMode`,
  `installerHooks`) in `tauri-utils` `config.rs`.

## Decided
- Identifier `io.github.floawty` stays (it names the profile folder); `publisher` is
  set explicitly, else Windows shows "github" as publisher.
- Installed vs. portable: `tauri::utils::platform::bundle_type()` (`Nsis` only in the
  bundler-patched exe); the portable artifact is the unpatched exe (changed in work:
  copied after bundling, see Evidence). Anything unclear counts as portable.
- The native WebView2 message (EN/DE by system language) lives in Rust: the one
  recorded exception to rule 13, because no webview exists at that point.

## Acceptance criteria
- [x] The setup installs into the NSIS template's per-user folder (no forked
      template) without a UAC prompt, as a standard local account; Start menu entry
      and uninstaller exist; Windows' app list shows the set publisher.
- [x] Uninstall keeps the user data; with "delete app data" ticked, settings and log
      (`%APPDATA%\floawty`) and the profile (`%LOCALAPPDATA%\io.github.floawty`) are
      gone (installer hook).
- [x] The portable exe runs from any folder and writes nothing next to itself.
- [x] Installed and portable floawty use the same settings and profile.
- [x] `bundle_type()` says installed for the setup's exe and portable for the
      portable exe (both artifacts tested).
- [x] With WebView2 hidden (`WEBVIEW2_BROWSER_EXECUTABLE_FOLDER` on an empty folder
      or an equivalent), the portable build shows the message with Microsoft's
      download link and exits.
- [x] The installer offers English and German. `npm run measure` budgets hold.

## Tests first
- Rust: WebView2 detection maps "no runtime version" to the message and a version to
  start; the installed/portable decision falls back to portable.

## Checks
- `npm run verify`; install and uninstall as a standard user from Explorer (not from
  the Claude app, whose AppData is virtualized); `npm run measure`.

## Evidence
- Tests first: `distribution.rs` red (4 of 6 failing on stubs: build decision,
  WebView2 mapping, message language), then green; logbook startup line red with the
  build name, then green.
- Changed in work: one `tauri build` instead of `--no-bundle` plus a bundle run. The
  bundler copies the exe, patches it only while packing the setup and restores it
  (`tauri-bundler` `bundle.rs`, CLI 2.12.5), so the portable copy is taken after
  bundling; the script fails if that copy lacks the unpatched marker. The build name
  goes into the startup log line, which makes `bundle_type()` checkable.
- The installer picks its language from Windows (no language dialog).
- README and PRIVACY name the installer's WebView2 download ([[release-pipeline]]).
- Independent review (advisor, 2026-11-26), no must-fix. Fixed: S1 unguarded portable
  copy → marker check in the script; S2 `release\` cleared only after a successful
  build → cleared first; nits: unreachable "WebView2 unknown" path removed (the gate
  guarantees a version), tech-note wording. S3 (profile may survive "delete app data"
  while floawty runs) → checked in the maintainer's uninstall run. For the
  maintainer: invariant 3 does not name the installer's WebView2 download (disclosed
  in README and PRIVACY); the rule 13 exception is recorded here and in
  [[tech-distribution]] only.
- Hidden probes of the portable artifact (test-input launcher, fresh folders): the log
  says `floawty 0.1.0 (portable) started, WebView2 158.0.4370.33`; with
  `WEBVIEW2_BROWSER_EXECUTABLE_FOLDER` on an empty folder it writes no log and stays
  blocked (in the message box). Nothing appears in `release\` besides the two exes.
- Maintainer's run from Explorer (2026-11-26, standard account, real data backed up
  first and restored after): setup without UAC prompt, German installer; floawty
  logged `floawty 0.1.0 (installed) started`, and the portable build's
  `(portable) started` landed in the same `%APPDATA%\floawty` log; plain uninstall
  kept the data;
  reinstall, start, uninstall with "delete app data" while floawty ran: `%APPDATA%\
  floawty`, `%LOCALAPPDATA%\io.github.floawty`, the install folder and the uninstall
  registry key were all gone (resolves review S3). Start menu entry and the publisher
  in the app list: the maintainer's "all worked", not checked separately. English
  installer: configured, not seen (German Windows).
- Visible run (maintainer's yes): portable with `WEBVIEW2_BROWSER_EXECUTABLE_FOLDER`
  on an empty folder showed the German box with the download page link (read through
  UI Automation); "No" ended floawty, no log written.
- `npm run check` green; `npm run smoke:hidden` 47/47 on the release build (twice).
- `npm run measure` 2026-11-26 (maintainer's yes) 5/5 green: portable 3.3 MiB, start
  230 ms (qt-04 method, budget 400 ms), idle 216.5 MB / 0 %, after hover 246.9 MB,
  hover with animations off 227.1 MB, YouTube 1080p 725.9 MB / 0.34 % CPU at
  61.2 fps, hidden 718.8 MB.

## Resume here
Done on `feat/rel-02-installer-and-portable` (on `main` d0bfdd7); waiting for the
maintainer's OK on the commit. Next in [[plan-release]]: rel-03 (update by click) or
rel-05 (settings export), one after the other.
