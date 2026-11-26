---
type: plan
tags: [package, release, dist]
status: in-progress
created: 2026-11-20
updated: 2026-11-26
source: visual plan "Phase 3 – Release-Pipeline", approved 2026-11-20
---

# rel-01 – Every pull request is checked on GitHub

Plan: [[plan-release]]

## Outcome
A GitHub Actions workflow runs `npm run check` on `windows-latest` for every pull
request and every push to `main` that changes more than notes.

## Scope
- Owns: `.github/workflows/ci.yml`, `rust-toolchain.toml`, CONTRIBUTING.md (what CI
  checks), notes.
- Non-goals: release builds (rel-05), `npm run measure` in CI (shared runners measure
  too unevenly), signing, other operating systems.
- Read first: root `package.json` scripts, `playwright.config.ts`, `tests/desktop.ts`,
  [[engineering-standards]] §1–2, [[release-pipeline]].

## Decided
- CI runs `npm run check` only (maintainer, 2026-11-26: keep CI lean). Commits that
  change only `*.md`, `knowledge-base/` or `.claude/plans/` start no run. The
  release build left CI: `check` compiles both Rust workspaces, `verify` builds
  locally before a merge, and rel-06 builds on the tag (warm run with it 5.5 min,
  of which the build 1.2 min). The app tests do not run in CI:
  on the runner every one failed at floawty's start on the hidden desktop, WebView2
  "failed to create webview … 0x80070578 Invalid window handle" (first run
  45496192486, 2026-11-24; check, lockfiles, build and test launcher green). They
  run locally (`npm run verify`) before every merge to `main` and every release
  ([[release-pipeline]], [[app-tests-run-hidden]]); the test launcher build left CI
  with them.
- Instead of `cargo … --locked` (the npm scripts have no flag for it), CI fails when
  `npm run check` changed a `Cargo.lock`; `npm ci` already refuses a stale npm lock.
- No test artifact on failure: the app tests write no traces or screenshots, and
  publishing floawty's logs from the runner needs a decision first.

## Acceptance criteria
- [ ] A pull request shows one check that runs `npm run check` (types, lint, format,
      Vitest, adapter tests, `cargo fmt`/`clippy`, `cargo test`).
- [ ] A deliberately broken commit (failing unit test) turns the check red.
- [x] Rust and npm caches keep a warm run under about 15 minutes (5.5 min with the
      build, run 45499300716).
- [x] `smoke:hidden` passes three runs in a row on the runner, or is skipped with the
      reason recorded here and in CONTRIBUTING.md (skipped, see "Decided").
- [ ] The workflow runs on `pull_request` (never `pull_request_target`), has
      read-only `contents` permission, actions pinned by full SHA, `npm ci`,
      unchanged `Cargo.lock` files after `check` and a pinned Rust toolchain (clippy
      runs with `-D warnings`).
- [x] App tests that load example.com work on the runner or are stated as flaky (no
      app tests in CI).

## Tests first
- None for the workflow itself; the red/green proof is the broken-commit run.

## Checks
- Workflow runs on a branch pushed with the maintainer's OK (push only on request).
- `npm run verify` locally.

## Open points (do not guess)
- Pushing a test branch and opening a pull request needs the maintainer's OK.

## Resume here
On `main` without a pull request (maintainer, 2026-11-24): a0707c0; the app tests
left CI after the first run, the release build and note-only runs on 2026-11-26.
Advisor review: no must-fix, findings resolved (see "Decided"). Green on `main`:
45499300716. Next: a deliberately failing unit test on a branch with a pull request
to see red (needs the maintainer's OK to push), then `done`.
