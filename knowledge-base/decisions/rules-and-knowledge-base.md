---
type: decision
area: process
tags: [rules, documentation, agents]
status: active
created: 2026-11-16
updated: 2026-11-16
source: conversation
---

# AGENTS.md holds the rules, the knowledge base holds everything else

## Context

floawty is developed with coding agents (Claude, Codex) and open to outside
contributors. Rules must be found by every tool without duplicating them, and project
knowledge must survive between sessions without chat history.

## Decision

- Root `AGENTS.md` is the single source of working rules; `CLAUDE.md` imports it and
  adds only Claude-specific parts (the `visual-plan` skill).
- Everything else lives in `knowledge-base/` (Obsidian-compatible): overview,
  decisions, plans, research, tech notes, standards.
- Planning goes through visual planning pages, then plan maps and packages
  ([[planning]]).
- Adapted from the maintainer's projects configuratorCore, varchy, varchari,
  processRecorder and planningPoker: ask instead of inventing, simplest solution,
  test first, size limits, completion order, explicit Git, no AI attribution.

## Alternatives

- A `docs/` folder with ADRs only – rejected: no place for plans, research and
  resume state.
- Rules split across several files – rejected: one rule source is easier to keep
  consistent.

## Consequences

- User-facing files (README, CONTRIBUTING, PRIVACY, SECURITY, CHANGELOG) stay in the
  repository root; the knowledge base is internal but public.
- `.claude/settings.json` enforces the Git rules for Claude sessions.
