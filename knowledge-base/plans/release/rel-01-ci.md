---
type: plan
tags: [package, release, dist]
status: in-progress
created: 2026-11-20
updated: 2026-11-24
source: visual plan "Phase 3 – Release-Pipeline", approved 2026-11-20
---

# rel-01 – Every pull request is checked on GitHub

Plan: [[plan-release]]

## Outcome
A GitHub Actions workflow runs the checks of `npm run verify` on `windows-latest` for
every pull request and every push to `main`.

## Scope
- Owns: `.github/workflows/ci.yml`, `rust-toolchain.toml`, CONTRIBUTING.md (what CI
  checks), notes.
- Non-goals: release builds (rel-05), `npm run measure` in CI (shared runners measure
  too unevenly), signing, other operating systems.
- Read first: root `package.json` scripts, `playwright.config.ts`, `tests/desktop.ts`,
  [[engineering-standards]] §1–2, [[release-pipeline]].

## Decided
- CI runs the same steps as `npm run verify`: `check`, release build, test launcher
  and the app tests on a hidden desktop (`smoke:hidden`, [[app-tests-run-hidden]]).
- If `smoke:hidden` is not stable on the runner (hidden desktop, shim, debug port
  9334), CI skips it with a stated reason and it runs locally before every release
  ([[release-pipeline]]). The `@real` tests never run in CI.
- Instead of `cargo … --locked` (the npm scripts have no flag for it), CI fails when
  `npm run check` changed a `Cargo.lock`; `npm ci` already refuses a stale npm lock.
- No test artifact on failure: the app tests write no traces or screenshots, and
  publishing floawty's logs from the runner needs a decision first.

## Acceptance criteria
- [ ] A pull request shows one check that runs `npm run check` (types, lint, format,
      Vitest, adapter tests, `cargo fmt`/`clippy`, `cargo test`), release build, test
      launcher and `smoke:hidden`.
- [ ] A deliberately broken commit (failing unit test) turns the check red.
- [ ] Rust and npm caches keep a warm run under about 15 minutes.
- [ ] `smoke:hidden` passes three runs in a row on the runner, or is skipped with the
      reason recorded here and in CONTRIBUTING.md.
- [ ] The workflow runs on `pull_request` (never `pull_request_target`), has
      read-only `contents` permission, actions pinned by full SHA, `npm ci`,
      unchanged `Cargo.lock` files after `check` and a pinned Rust toolchain (clippy runs with `-D warnings`).
- [ ] App tests that load example.com work on the runner or are stated as flaky.

## Tests first
- None for the workflow itself; the red/green proof is the broken-commit run.

## Checks
- Workflow runs on a branch pushed with the maintainer's OK (push only on request).
- `npm run verify` locally.

## Open points (do not guess)
- Pushing a test branch and opening a pull request needs the maintainer's OK.

## Resume here
Branch `feat/rel-01-ci` in worktree `.claude/worktrees/rel-01-ci`, moved onto `main`
582c165 (quiet tests merged). Written, not committed: `.github/workflows/ci.yml`
(actions pinned by SHA, `contents: read`, caches for both Cargo workspaces also on
failure, the steps of `verify` with `smoke:hidden`, Cargo lockfile check; only pull
request runs cancel each other), `rust-toolchain.toml` (1.96.0, same as local),
CONTRIBUTING. `npm run check` green locally; advisor review: no must-fix, findings
resolved (see "Decided"). Not yet run on GitHub.
Next: maintainer's OK to commit, push and open a draft pull request; then a
deliberately failing commit to see red, then settle `smoke:hidden` on the runner
(three green runs, or skip with the reason).
