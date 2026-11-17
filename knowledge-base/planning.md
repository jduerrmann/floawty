---
type: note
area: process
tags: [rules, planning]
status: active
created: 2026-11-16
updated: 2026-11-16
source: conversation; adapted from the varchy and configuratorCore planning policies
---

# Plans and work packages

How multi-session work is planned so any later session can resume without chat
history. Simple fixes need no plan.

## Flow

1. **Visual plan.** New features, UI and architecture questions start with a planning
   page (Claude: `visual-plan` skill). The page is an approval artefact, not the plan.
2. **Plan map.** After approval, the result becomes
   `plans/<plan-id>/plan-<plan-id>.md`: outcome, order, dependencies, one row per
   package. Registered in [[active-plans]].
3. **Packages.** One independently verifiable outcome each, from
   `templates/t-package.md`, named `<prefix>-<NN>-<outcome>.md`. Only real packages,
   no empty phases.

## Package contract

- Status: `planned` · `ready` · `in-progress` · `awaiting-answer` · `blocked` · `done`.
- Outcome, non-goals, required decisions, minimal read set, files it owns.
- Observable acceptance criteria incl. failure cases, the tests to write first, the
  checks to run, the docs to update.
- A **Resume here** section (~1 KB): state, branch, last check results, next action.

The package is the only progress record. Update it at phase boundaries and before a
session ends with work unfinished. `done` needs every acceptance item, the checks and
the doc updates.

## Complete and archive

Record the evidence in the package, move lasting knowledge to tech notes and
decisions, set `done`, then move the package to `archive/plans/<plan-id>/`. When all
packages are done, archive the map and remove it from [[active-plans]].

## Resume in a new session

Read [[active-plans]] → plan map → the next package's read set. Compare its Resume
section with `git status` and the files, then continue from the recorded next action.
