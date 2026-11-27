---
type: plan
tags: [plan-map, release, dist]
status: active
created: 2026-11-20
updated: 2026-11-27
source: visual plan "Phase 3 – Release-Pipeline", rounds 1–2, approved 2026-11-20; "Release 0.1.0 – der Rest", approved 2026-11-27
---

# Plan – Release pipeline (phase 3)

## Outcome
Anyone downloads floawty 0.1.0 from GitHub Releases (portable or installer), starts it
without admin rights, can check the download against published checksums, gets
updates by click or, if they turn it on, automatically, and can carry settings to
another PC by export and import.
Decisions: [[release-pipeline]], [[updates-by-tauri-updater]],
[[settings-export-without-logins]], [[unsigned-first-then-signpath]].

## Decided (visual plan, 2026-11-20)
- CI checks every pull request like `npm run verify`, smoke test included; if the
  smoke test is unstable on `windows-latest`, CI skips it and it runs locally before
  every release.
- Release: the maintainer runs `npm run verify` and the live service checks locally,
  pushes tag `vX.Y.Z` on `main`; the workflow builds and publishes once all assets are
  attached (no draft). It fails when the tag and the version numbers differ.
- Assets: `floawty-X.Y.Z-portable.exe`, `floawty-X.Y.Z-setup.exe` (NSIS, current
  user, EN/DE, downloads WebView2 if missing), `SHA256SUMS.txt`, updater files.
  Windows x64 only. Release text from the CHANGELOG section of the version.
- Portable keeps its data in the user folders like the installer; without WebView2
  it shows a message with a link instead of failing silently.
- Updates ([[updates-by-tauri-updater]]): "Check for updates" in the settings next to
  the installed version; automatic updates off by default, then a check at start and
  every 24 h, download in the background, install when the user quits floawty. The
  portable build only shows a hint with a link to the release page.
- Export and import of settings, own tiles and hotkeys ship in 0.1.0, never logins
  ([[settings-export-without-logins]]).
- Signing: 0.1.0 unsigned, then apply to SignPath Foundation.
- First public version is 0.1.0, after release candidates `0.1.0-rc.N` published as
  GitHub pre-releases. README names the measured download size.

## Constraints
- The glass design ([[plan-glass]]) ships before 0.1.0 (maintainer, 2026-11-21):
  rel-03's update button goes into the settings' General card, rel-05's export and
  import into the Data card next to reset.
- Rules 5 (dependencies need OK: `tauri-plugin-updater` approved 2026-11-20, Rust
  side only; any other new dependency asks first), 10, 12 (releases only from GitHub
  Actions, push only on explicit request), 13 (visible text in `src/i18n.ts`; the
  native WebView2 message is the recorded exception), 14 (independent review).
- Principle 3: floawty talks to GitHub Releases only when the user clicks or turned
  automatic updates on. The maintainer approved amending its wording to "check,
  download and install" (2026-11-20); rel-03 makes the edit.
- One branch per package (`feat/rel-NN-…`), commit after the maintainer's OK.

## Packages

| # | Package | Outcome | Depends on |
|---|---|---|---|
| 01 | [[rel-01-ci]] | Every pull request is checked on GitHub | – |
| 02 | [[rel-02-installer-and-portable]] | Installer and portable start without admin; missing WebView2 explained | – |
| 03 | [[rel-03-update-by-click]] | Updates by click; portable shows a hint; `latest.json` helper | 02 |
| 04 | [[rel-04-automatic-updates]] | Automatic check, background download, install on quit | 03 |
| 05 | [[rel-05-settings-export]] | Settings move by file; newer settings never silently lost | – |
| 06 | [[rel-06-release-workflow]] | A tag builds, checks and publishes the release | 01, 02, 03 |
| 07 | [[rel-07-first-release]] | 0.1.0 is public after rc → rc updates proved | 04, 05, 06, sf-01–04, gl-02 |
| 08 | [[rel-08-signpath]] | Releases are signed through SignPath Foundation | 07 |

Order (maintainer, 2026-11-27): 03, 05, 04, 06, 07; 08 after 0.1.0. One commit per
package after the maintainer's OK. 01 and 02 are done.
02, 03 and 05 share `main.rs` and the settings files, so they run one after another,
not as parallel writers. 08 waits for SignPath's acceptance.

0.1.0 also ships [[plan-short-feeds]] (sf-01 to sf-04, maintainer, 2026-11-20). Shared
ground: the AGENTS.md rule 9 line (rel-05; sf-02 and sf-04 add items), `OpenService`
in `settings.rs` (sf-04 adds `signInHosts`; rel-05 owns compatibility), `src/i18n.ts`,
`capabilities/main.json` (rel-03).
