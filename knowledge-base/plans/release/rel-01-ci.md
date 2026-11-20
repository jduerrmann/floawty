---
type: plan
tags: [package, release, dist]
status: ready
created: 2026-11-20
updated: 2026-11-20
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
- CI runs the same steps as `npm run verify`, smoke test included.
- If the smoke test is not stable on the runner (real mouse, global hotkeys, debug
  port 9334), CI skips it with a stated reason and it runs locally before every
  release ([[release-pipeline]]).

## Acceptance criteria
- [ ] A pull request shows one check that runs types, lint, format, Vitest,
      `cargo fmt`/`clippy`, `cargo test`, build and smoke test.
- [ ] A deliberately broken commit (failing unit test) turns the check red.
- [ ] Rust and npm caches keep a warm run under about 15 minutes.
- [ ] The smoke test passes three runs in a row on the runner, or is skipped with the
      reason recorded here and in CONTRIBUTING.md.
- [ ] The workflow runs on `pull_request` (never `pull_request_target`), has
      read-only `contents` permission, actions pinned by full SHA, `npm ci`,
      `cargo … --locked` and a pinned Rust toolchain (clippy runs with `-D warnings`).
- [ ] App tests that load example.com work on the runner or are stated as flaky.

## Tests first
- None for the workflow itself; the red/green proof is the broken-commit run.

## Checks
- Workflow runs on a branch pushed with the maintainer's OK (push only on request).
- `npm run verify` locally.

## Open points (do not guess)
- Pushing a test branch and opening a pull request needs the maintainer's OK.

## Resume here
Not started. Next: write `ci.yml`, ask the maintainer to allow a push of
`feat/rel-01-ci` and a draft pull request to watch the first run.
