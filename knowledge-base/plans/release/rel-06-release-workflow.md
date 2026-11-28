---
type: plan
tags: [package, release, dist]
status: in-progress
created: 2026-11-20
updated: 2026-11-28
source: visual plan "Phase 3 – Release-Pipeline", approved 2026-11-20; advisor review
---

# rel-06 – A tag builds, checks and publishes the release

Plan: [[plan-release]]

## Outcome
Pushing tag `vX.Y.Z` on `main` runs a workflow that checks the tag, runs the checks,
builds portable and installer, smoke-tests the installed setup, signs the updater
files, writes `SHA256SUMS.txt` and `latest.json`, and publishes the GitHub release
with the CHANGELOG section once every asset is attached.

## Scope
- Owns: `.github/workflows/release.yml`, `scripts/` helpers (version check, CHANGELOG
  section, checksums), a bundle build on pushes to `main` in `ci.yml`, configurable
  exe path in the Playwright helpers (`tests/app.ts`, `graphics-acceleration.spec.ts`,
  `measure/budgets.spec.ts`), `*.key` in `.gitignore`, CONTRIBUTING.md (release and
  "pull a bad release" steps), [[release-pipeline]] if details change.
- Non-goals: Authenticode signing (rel-08), draft releases, other platforms.
- Read first: [[release-pipeline]], [[updates-by-tauri-updater]], rel-01 to rel-03.

## Acceptance criteria
- [ ] Fails before building when the tag differs from the versions in
      `package.json`, `Cargo.toml`, `tauri.conf.json`, when the tag commit is not on
      `main`, or when the CHANGELOG has no section for the version.
- [ ] The built setup is installed silently in the job and the smoke test runs
      against the installed exe before anything is uploaded, tried first as a
      visible run on the runner's desktop. If it cannot run there, the job skips it
      and the rc's CI-built setup is checked locally (`smoke:hidden` against the
      installed exe) before any stable tag; CONTRIBUTING names that step.
- [ ] The updater signature is bound to the version (`tauri signer sign --app-version
      X.Y.Z`; floawty sets `requireSignedVersion`, rel-03), and the job fails before
      building when `plugins.updater.pubkey` in `tauri.conf.json` is empty.
- [ ] The maintainer generates the updater key pair (password manager plus backup);
      the public key goes into `tauri.conf.json`, key and password into the
      environment secret.
- [ ] Updater signing is an explicit last step (`tauri signer sign` on the final
      file), not `createUpdaterArtifacts` in the base config, so `build:release` runs
      without the key and rel-08's Authenticode step needs no rework.
- [ ] The private key is an environment secret limited to `v*` tags; no third-party
      action runs in the signing job; the workflow can write releases only.
- [ ] The release holds portable, setup, `SHA256SUMS.txt`, `latest.json` and the
      signature; checksums verify; publishing happens after all uploads.
- [ ] The job lists the files inside portable and setup; none is the test launcher
      or shim from `tools/test-input` ([[app-tests-run-hidden]]).
- [ ] `vX.Y.Z-rc.N` tags publish as GitHub pre-releases (versions bumped to the rc,
      CHANGELOG section `[X.Y.Z-rc.N]`); the stable updater endpoint ignores them.

## Tests first
- Node: version check, CHANGELOG section extraction, on fixtures.

## Checks
- `npm run verify`; one full `v0.1.0-rc.1` run.

## Evidence (2026-11-28)
- `release.yml` (lead): job `build` without secrets or build cache, job `publish` in
  environment `release` with `contents: write` and only GitHub's own actions;
  `workflow_dispatch` runs `build` alone as a dry run. `ci.yml` builds portable and
  setup on pushes to `main`. Exe path for the tests was already `FLOAWTY_TEST_EXE`.
- `scripts/release-check.mjs` and `scripts/changelog-section.mjs` by `coder` from a
  brief, tests first (20 Vitest cases); lead read the code. Against the repo today:
  exactly "no `## [0.1.0]` section" and "pubkey empty".
- NSIS bundles `0.1.0-rc.1` (local build, 2026-11-28); `tests/smoke.spec.ts` accepts
  an rc version and passes hidden. `npm run check` green.
- Independent review by `advisor`. Must-fix resolved: an unquoted `'push'` in
  `ci.yml` would have rejected the whole CI file. Resolved: the sign step calls the
  Tauri CLI by path (no registry fetch next to the key); the setup listing must show
  `Type = Nsis` and `floawty.exe`; `package-manager-cache: false`; a test for a table
  before `[package]`; CONTRIBUTING names the tag ruleset, the tag-type environment
  rule, folding rc sections into `[X.Y.Z]` and deleting a draft after a failed publish.
  Accepted: the dry run skips the tag check and `publish`, so signing, `latest.json`
  and `gh release create` first run on `v0.1.0-rc.1`, and a failure there costs an rc
  number. For rel-07: nothing checks that the secret key matches the pubkey until the
  rc.1 → rc.2 update. Open: the build timeout (45 min) and the smoke fallback follow
  the dry run.
- Maintainer, 2026-11-28: updater key pair made (minisign key id 074781627943610E), the
  public key is in `tauri.conf.json`; environment `release` with a tag rule `v*` and both
  secrets, tag ruleset `release tags` on `v*` (creation, update, deletion, force push;
  admin bypass), all read back with `gh api`. `release-check v0.1.0` now reports only
  the missing `[0.1.0]` section.
- Dry run 46138104423 on `main` 344a90c (2026-11-28): check, lockfiles, `build:release`,
  7z listing (`Type = Nsis`; `floawty.exe`, `uninstall.exe`, NSIS plugins only) and the
  silent install green; the visible smoke test failed, "WebView2 debug port did not
  open" after 15 s. Maintainer chose the fallback: the smoke step left the workflow,
  CONTRIBUTING has the local check of the rc setup (download, install, `smoke:hidden`
  with `FLOAWTY_TEST_EXE`). Build job 13.5 min uncached, timeout now 30 min. CI on the
  same push green, its bundle job 5 min.

## Resume here
Workflow proven up to the install. Next: tag `v0.1.0-rc.1` (versions and a CHANGELOG
section bumped to the rc, maintainer's explicit request), which runs `publish` for the
first time; then the local check of its setup. Package done after that run.
