---
type: decision
area: process
tags: [agents, review, workflow]
status: active
created: 2026-11-21
updated: 2026-11-21
source: conversation, maintainer's OK 2026-11-21
---

# Reviews are leaner: advisor at high effort, one review per UI plan

Amends [[advisor-and-coder-subagents]].

## Context
A plan-map check took about 13 minutes and 93 file reads, including dependency
sources; every package of a multi-package UI plan added its own review, app run and
commit round. The maintainer found work on topics too slow.

## Decision
- `advisor` runs at effort high instead of max, with a reading budget: the diff and
  the named files first, further files only as evidence, about 25 reads, never
  dependency sources unless the brief asks.
- A plan map gets an advisor check only when the plan contains a hard-to-reverse
  part (stored formats, IPC and capabilities, navigation guard, adapter contract,
  dependencies, rules).
- In a multi-package plan, a package that touches only the UI layer gets the main
  session's recorded own review; the plan's last package gets one independent review
  of all the plan's changes since `main` (AGENTS.md rule 14).
- Plans prefer fewer, larger packages where the parts are verified the same way.

## Alternatives
- Keep max effort and a review per package – rejected: too slow for UI work.
- Drop independent reviews for UI work entirely – rejected: one second view per plan
  still catches cross-package mistakes.

## Consequences
- Deep findings that need dependency sources (such as Tauri's theme API reaching the
  shared profile) become rarer; ask for them explicitly in the brief when they matter.
- Earlier UI packages of a plan are committed without an independent review; the
  final review's fixes land in the last package.
