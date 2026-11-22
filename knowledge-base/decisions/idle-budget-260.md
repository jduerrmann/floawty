---
type: decision
area: process
tags: [resources, budget, measurement]
status: active
created: 2026-11-22
updated: 2026-11-22
source: conversation (maintainer, 2026-11-22)
---

# The idle RAM budget is 260 MB

Supersedes the idle value of [[stack-by-spike]]; the other budgets stay.

## Context
The 250 MB budget came from the spike's 188 MB. The same build now varies by
15–35 MB from start to start: be9a7b0 measured 258.7, 243.1 and 257.6 MB on a quiet
PC, gl-03 261.9, 244.3 and 225.1 MB. The build without gl-03 was over budget too.

## Decision
- Idle RAM on the untouched tiles: ≤ 260 MB. The maintainer chose this: the
  difference is about 10 MB of RAM.
- One value over budget is measured twice more; the median of the three decides.

## Alternatives
- Keep 250 MB – fails builds by chance and by the glass design before gl-03.
- Compare several starts with the previous build every time – more measuring time
  for little gain.

## Consequences
- `tests/measure/budgets.spec.ts`, [[engineering-standards]] §7 and the README use
  260 MB. Older notes keep the value that applied to them.
