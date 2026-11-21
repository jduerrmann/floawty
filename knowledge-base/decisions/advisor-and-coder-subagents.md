---
type: decision
area: process
tags: [agents, review, delegation]
status: active
created: 2026-11-17
updated: 2026-11-21
source: conversation (after mvp-05)
---

# The main session leads; `coder` implements bounded slices, `advisor` reviews

**Amended by [[leaner-reviews]]** (2026-11-21): advisor at effort high, one review
per UI plan.

## Context

Up to mvp-05 the main session did everything itself and was also the only reviewer
of its own diff. The maintainer uses a lead/worker/adviser split in configuratorCore
and wants the same for floawty.

## Decision

- Every work package and every other change to code, tests, build configuration or
  rules gets an independent read-only review of its diff before the commit proposal
  (AGENTS.md rule 14, runtime-neutral); notes-only changes and pure execution do not.
- Claude: when the main session runs Opus 5.5 it leads; `coder` (Sonnet 5.5, effort
  high) implements slices that can be specified up front; `advisor` (Fable 5.2,
  effort max, read-only) gives second opinions in four cases and does the review.
  Agent files in `.claude/agents/`, rules in `CLAUDE.md`.
- `coder` assignments within the current task need no extra OK; commits, pushes and
  new dependencies still do.
- Leaner than configuratorCore: no separate delegation note and no Codex roles;
  delegation and reviews are recorded in the package's evidence, outside a package in
  the report and the commit message.

## Alternatives

- Keep working alone and review the own diff – rejected: no second view before a
  commit.
- Only `advisor`, no `coder` – possible, but slices such as per-service selectors
  (mvp-07) are well specified and cheaper on Sonnet.
- configuratorCore's full delegation policy – rejected for now: floawty is smaller;
  one section in `CLAUDE.md` is enough.

## Consequences

- No cost saving is promised: briefs, reviews and retries cost too; Fable at
  maximum effort per review is the largest part.
- Model IDs and effort are pinned in the agent files; change them there on purpose.
- The completion order gains "independent review" before the commit proposal.
