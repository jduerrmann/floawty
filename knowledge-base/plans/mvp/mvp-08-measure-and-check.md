---
type: plan
tags: [package, mvp, performance, services]
status: planned
created: 2026-11-17
updated: 2026-11-17
source: conversation
---

# mvp-08 – Measure against budgets, service checks

Plan: [[plan-mvp]]

## Outcome

The MVP is shown to meet the budgets and to work with every service; the result
decides whether the release pipeline (phase 3) starts.

## Scope

- Owns: `--scenario` support in the app (idle, youtube-1080p, hidden) or an
  equivalent driver for `spikes/measure`, a results note.
- Non-goals: optimisation beyond the budgets.
- Read first: [[stack-by-spike]] (budgets), [[stack-spike-results]], `spikes/measure/README.md`.

## Acceptance criteria

- [ ] Download ≤ 10 MiB, start ≤ 200 ms, RAM idle ≤ 250 MB, RAM YouTube 1080p ≤ 850 MB,
      CPU idle and hidden ≈ 0 % – measured, numbers recorded.
- [ ] Idle network: only the disclosed WebView2 connection, nothing else.
- [ ] Maintainer checks: every tile plays, incl. Twitch, Apple TV+, Crunchyroll
      (tiles added for those that pass, [[drm-services-in-first-release]]).
- [ ] Results note under `research/` linked from the index.

## Checks

- `spikes/measure/run-scenarios.ps1` against the release build.

## Resume here

Not started.
