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
- Lint and tests must pass. User-facing changes get a line in `CHANGELOG.md`.

By contributing you agree that your contribution is licensed under GPL-3.0.

## Development setup

Will be documented once the tech stack is decided
(see [stack-by-spike](knowledge-base/decisions/stack-by-spike.md)).
