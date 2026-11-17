---
type: note
tags: [knowledge-base, conventions]
status: active
created: 2026-11-16
updated: 2026-11-16
source: conversation; adapted from the processRecorder knowledge-base conventions
---

# Knowledge base – Conventions

The knowledge base of **floawty**, for the maintainer, contributors and coding agents.
Notes are English. Working rules live in the root `AGENTS.md`; this note owns vault
conventions and budgets. The folder opens as an Obsidian vault (templates linked).

## What belongs where

| Content | Lives in |
|---|---|
| Working rules | root `AGENTS.md` (not here) |
| Product overview, scope, phases | `overview.md` |
| Code docs (architecture, invariants) – current state only, created with the code | `tech/` (created on first use) |
| Decision rationale | `decisions/` (MOC: `decisions.md`) |
| Multi-session work: plan maps and packages | `plans/` (entry: `plans/active-plans.md`) |
| Open questions | `open-questions.md` |
| Research and reference material | `research/` |
| Inactive material | `archive/` – moved here, never deleted |
| Saved pages, screenshots or content of the streaming services | nowhere – never |
| Secrets, tokens, account data | nowhere – never |

Grow lazily: a new folder or MOC only when a topic reaches ~5 notes.

## Budgets

- Hook lines in `INDEX.md` and MOCs: ≤ 140 characters.
- Tech notes: target ≤ 16 KB; above 24 KB split into sub-notes plus a parent with a
  "working on X → read Y" map.
- Notes > 8 KB are read via their headings (`rg -n "^## "`) plus relevant sections.
- Plan packages: 2–6 KB, with a **Resume here** section of ~1 KB.

## Frontmatter (every note)

```yaml
---
type: note | decision | research | tech | plan | moc
area: window          # decisions and tech notes; vocabulary below
tags: [..]
status: draft | active | done | archived
created: YYYY-MM-DD
updated: YYYY-MM-DD
source: conversation | url | manual   # origin only, one short phrase
---
```

`area:` vocabulary (fixed): one primary value, a second only for cross-area notes.

| Area | Covers |
|---|---|
| `window` | overlay window, geometry, snapping, opacity, click-through, hotkeys |
| `services` | service adapters, sessions, DRM, "video only" view |
| `shorts` | YouTube Shorts auto mode |
| `ui` | service picker, settings, i18n |
| `dist` | build, releases, update check, code signing |
| `process` | stack, rules, workflow, cross-cutting product rules |

## Naming and linking

- kebab-case, descriptive, no dates in names: `stack-by-spike.md`.
- Tech notes: `tech/tech-<area-or-topic>.md`.
- Wikilinks `[[note-name]]`. Every note is reachable from `INDEX.md` directly or via a
  MOC; plan packages via their plan map.
- New decision → hook line in `decisions.md`; new tech or research note → hook line
  in `INDEX.md`.

## Writing rules

- One concept per note; split instead of growing forever.
- Tech notes describe the current state only. History lives in git, rationale in
  `decisions/`.
- Never rewrite an old decision; add a new one and link it as superseding.
- Research notes state how verified their facts are; unverified claims are marked.
- Bump `updated:` on every edit. Search first; update an existing note instead of
  creating a near-duplicate.
- Planning pages from the `visual-plan` skill are approval artefacts; their answers
  are recorded here in decisions, plans and open questions.
