# Contributing to floawty

Thanks for helping! floawty is a small hobby project, so please keep changes focused.

## Before you start

1. Read the project rules in [AGENTS.md](AGENTS.md), especially the
   **invariants** (rule 2) (no ads, no server, no tracking, fair to the services).
   PRs that break them will be closed, however good the code is.
2. For anything bigger than a bug fix, open an issue first so we can agree on the
   approach.

## Typical contributions

- **A site changed and something broke** – use the "Service broken" issue template,
  or fix the selectors in `src/services/<id>/selectors.ts` directly.
- **A new service** – add a new adapter in `src/services/<id>/`. No changes to core
  code should be needed; if they are, explain why in the PR.
- **Translations** – add or fix strings in the locale files.

## Pull requests

- Branch from `main`, one topic per PR.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix(youtube):`, `docs:`, …).
- New dependencies: add a one-line justification and make sure the license is
  GPL-3.0-compatible.
- New logic and bug fixes start with a failing test (see
  [engineering standards](knowledge-base/engineering-standards.md)).
- Lint and tests must pass. GitHub runs `npm run check` on Windows for every pull
  request that changes more than notes (`.github/workflows/ci.yml`); a changed
  lockfile fails it. The release build and the app tests do not run there (WebView2
  gets no window on the runner's hidden desktop), so run `npm run verify` yourself
  before asking for a merge.
  User-facing changes get a line in `CHANGELOG.md`.

By contributing you agree that your contribution is licensed under GPL-3.0.

## Development setup

floawty is built with Tauri 2 (Rust + TypeScript) on WebView2, Windows 10/11 only
([stack-by-spike](knowledge-base/decisions/stack-by-spike.md)).

You need Node.js 24+, `rustup` (it installs the Rust version pinned in
`rust-toolchain.toml`) and the WebView2 runtime (part of Windows 11).

```powershell
npm install
npm run dev       # app with hot reload
npm run check     # quiet checks while you work: types, lint, format, Vitest,
                  # adapter tests, cargo fmt, clippy, cargo test
npm run verify    # check + release build + test launcher + app tests on a hidden
                  # desktop (smoke:hidden); nothing appears on your screen
npm run smoke:real  # the few tests that need your real mouse (before a release)
```

| Path | What |
|---|---|
| `src/` | floawty's own UI (TypeScript, Vite, no framework) |
| `src/services/<id>/` | one adapter per streaming service |
| `src-tauri/` | Rust shell: window, settings, hotkeys |
| `tests/` | Playwright tests, driven over WebView2's debug port |

Logs are written to `%APPDATA%\floawty\logs\floawty.log` and never leave your PC.

## Releases (maintainer)

GitHub Actions builds every release from a tag (`.github/workflows/release.yml`), never
a laptop ([release-pipeline](knowledge-base/decisions/release-pipeline.md)).

1. On `main`, set the version everywhere: `npm version X.Y.Z --no-git-tag-version`
   (package.json and its lockfile), `version` in `src-tauri/Cargo.toml` (then
   `cargo check --manifest-path src-tauri/Cargo.toml` updates `Cargo.lock`) and in
   `src-tauri/tauri.conf.json`. Move the `[Unreleased]` lines of `CHANGELOG.md` under
   `## [X.Y.Z] - YYYY-MM-DD`. A release candidate uses `X.Y.Z-rc.N` in all of these and
   its own section; at the stable tag the rc sections fold into `[X.Y.Z]`, which then
   lists everything since the last stable release.
2. Locally: `npm run verify`, `npm run smoke:real` and the live checks on the services.
3. Commit, push `main`, then push the tag: `git tag vX.Y.Z` and
   `git push origin vX.Y.Z`.

The workflow stops before building when the tag is not on `main`, a version or the
CHANGELOG section does not match, or the updater key in `tauri.conf.json` is empty.
It then runs `npm run check`, builds, lists the setup's files, installs the setup
silently and runs the smoke test on the installed floawty. Only then does the
`publish` job sign the setup for the updater (bound to the version), write
`latest.json` and `SHA256SUMS.txt`, and publish the release with the CHANGELOG
section. A `-rc.N` tag becomes a pre-release, which the updater never sees (it asks
for `/releases/latest`). **Actions → Release → Run workflow** on a branch builds and
smoke-tests without signing or publishing. If `publish` fails after it started, delete
the draft release it may leave (`gh release delete vX.Y.Z`, keeping the tag) and re-run
the failed job.

The updater key pair is made once: `npx tauri signer generate -w <path outside the
repo>` with a password. The public key goes into `plugins.updater.pubkey`; the
private key file's content and the password go into the secrets
`TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` of the
environment `release`, whose deployment rule allows tags (not branches) matching
`v*`. A tag ruleset on `v*` lets only the maintainer create, move or delete such tags,
as any tag that starts the workflow reaches the key. Keep both in a password manager
with a backup: without the key, installed floawtys cannot update any more.

### Pulling a bad release

1. Turn it into a pre-release, so the updater offers the previous version again:
   `gh release edit vX.Y.Z --prerelease`, then `gh release edit vPREVIOUS --latest`.
2. Put a line at the top of its release text saying what is wrong.
3. Fix it and release `X.Y.Z+1`. Never reuse a version or move a tag: floawtys that
   already updated install only a newer version.
