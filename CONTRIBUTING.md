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
