---
type: plan
tags: [package, release, dist, window]
status: ready
created: 2026-11-20
updated: 2026-11-20
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
  bundler-patched exe); the portable artifact is the `--no-bundle` exe copied before
  bundling. Anything unclear counts as portable.
- The native WebView2 message (EN/DE by system language) lives in Rust: the one
  recorded exception to rule 13, because no webview exists at that point.

## Acceptance criteria
- [ ] The setup installs into the NSIS template's per-user folder (no forked
      template) without a UAC prompt, as a standard local account; Start menu entry
      and uninstaller exist; Windows' app list shows the set publisher.
- [ ] Uninstall keeps the user data; with "delete app data" ticked, settings and log
      (`%APPDATA%\floawty`) and the profile (`%LOCALAPPDATA%\io.github.floawty`) are
      gone (installer hook).
- [ ] The portable exe runs from any folder and writes nothing next to itself.
- [ ] Installed and portable floawty use the same settings and profile.
- [ ] `bundle_type()` says installed for the setup's exe and portable for the
      portable exe (both artifacts tested).
- [ ] With WebView2 hidden (`WEBVIEW2_BROWSER_EXECUTABLE_FOLDER` on an empty folder
      or an equivalent), the portable build shows the message with Microsoft's
      download link and exits.
- [ ] The installer offers English and German. `npm run measure` budgets hold.

## Tests first
- Rust: WebView2 detection maps "no runtime version" to the message and a version to
  start; the installed/portable decision falls back to portable.

## Checks
- `npm run verify`; install and uninstall as a standard user from Explorer (not from
  the Claude app, whose AppData is virtualized); `npm run measure`.

## Resume here
Not started. Next: bundle config (NSIS current user, publisher, languages), the
build script writing both artifacts to `release\`, then the WebView2 check test
first.
