---
type: tech
area: dist
tags: [release, installer, portable, webview2]
status: active
created: 2026-11-26
updated: 2026-11-28
source: rel-02 and rel-06 implementation
---

# Distribution: setup, portable build, WebView2 check

`npm run build:release` (`scripts/build-release.mjs`) runs `tauri build`, which packs
the NSIS setup configured in `src-tauri/tauri.conf.json` (`bundle`), and writes
`release\floawty-X.Y.Z-setup.exe` and `release\floawty-X.Y.Z-portable.exe`.
`npm run build` stays `--no-bundle` for the app tests. Decision: [[release-pipeline]].

`.github/workflows/release.yml` runs on a tag `vX.Y.Z` or `vX.Y.Z-rc.N`. Job `build` (no
secrets, no build cache): `scripts/release-check.mjs` (tag on `main`, the versions in
`package.json`, its lockfile, `Cargo.toml`, `Cargo.lock` and `tauri.conf.json`, a
CHANGELOG section, a non-empty updater key), `npm run check`, `build:release`, the
setup's file list (fails on the test launcher or shim) and a silent install into
`%LOCALAPPDATA%\floawty`. No app test runs there: WebView2 opens no window on the
runner, hidden or visible, so the rc setup is smoke-tested locally (CONTRIBUTING). Job
`publish` (environment `release`, `contents: write`, GitHub's own actions only): `tauri
signer sign --app-version`, `scripts/latest-json.mjs`, `scripts/changelog-section.mjs`,
`SHA256SUMS.txt`, then `gh release create`, which publishes after the last upload; rc
tags become pre-releases. `workflow_dispatch` runs `build` only. `ci.yml` builds
portable and setup on every push to `main`. Steps for the maintainer: CONTRIBUTING.md.

## Invariants
- No admin rights: the setup installs per user (`installMode: currentUser`) into the
  template's `%LOCALAPPDATA%\floawty`, with Start menu entry and uninstaller. The
  template is not forked; changes go through `src-tauri/installer-hooks.nsh`.
- Installed and portable floawty share one data location: settings and log in
  `%APPDATA%\floawty`, the WebView2 profile in `%LOCALAPPDATA%\io.github.floawty`
  (`paths.rs`). The portable exe writes nothing next to itself.
- The identifier `io.github.floawty` names the profile folder and never changes;
  `publisher` is set, else the bundler derives "github" from the identifier and
  Windows' app list shows that.
- Uninstalling keeps the data. With "delete app data" ticked, the template removes the
  identifier folders and the hook removes `%APPDATA%\floawty`; an update never does.
- If WebView2 is missing, the setup downloads and runs Microsoft's bootstrapper
  (`webviewInstallMode: downloadBootstrapper`); README and PRIVACY say so.
- The installer picks English or German from the Windows language.

## Structure
- `src-tauri/src/distribution.rs`: `Build::current()` reads
  `tauri::utils::platform::bundle_type()`. The bundler patches that marker into the
  exe only while it packs the setup and restores the exe afterwards, so the setup's
  exe says `Nsis` (installed) and the copied `target\release\floawty.exe` says
  nothing (portable). Anything else counts as portable. The build script fails if the
  portable copy lacks the unpatched marker, should a Tauri update change that. The startup log line names
  the build: `floawty 0.1.0 (portable) started, WebView2 …`.
- `main()` asks `tauri::webview_version()` before building the app. No version, or an
  empty one, shows a native message box (German on a German Windows, else English;
  the one exception to AGENTS.md rule 13, as no webview exists yet) with Microsoft's
  download page; "Yes" opens it in the default browser, then floawty exits.
- Tests: Rust unit tests for the build decision, the WebView2 mapping and the
  message language; the artifacts themselves are checked by hand (rel-02 evidence).

## Working on X → read Y
- Release workflow, assets, checksums → [[plan-release]], [[release-pipeline]]
- Data folders, reset → [[tech-window]], [[tech-bar-and-settings]]
- Updates, the portable hint → [[updates-by-tauri-updater]]
