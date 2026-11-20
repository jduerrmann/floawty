---
type: plan
tags: [package, release, dist]
status: planned
created: 2026-11-20
updated: 2026-11-20
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
      against the installed exe before anything is uploaded.
- [ ] Updater signing is an explicit last step (`tauri signer sign` on the final
      file), not `createUpdaterArtifacts` in the base config, so `build:release` runs
      without the key and rel-08's Authenticode step needs no rework.
- [ ] The private key is an environment secret limited to `v*` tags; no third-party
      action runs in the signing job; the workflow can write releases only.
- [ ] The release holds portable, setup, `SHA256SUMS.txt`, `latest.json` and the
      signature; checksums verify; publishing happens after all uploads.
- [ ] `vX.Y.Z-rc.N` tags publish as GitHub pre-releases (versions bumped to the rc,
      CHANGELOG section `[X.Y.Z-rc.N]`); the stable updater endpoint ignores them.

## Tests first
- Node: version check, CHANGELOG section extraction, on fixtures.

## Checks
- `npm run verify`; one full `v0.1.0-rc.1` run.

## Resume here
Not started; waits for rel-01 to rel-03.
