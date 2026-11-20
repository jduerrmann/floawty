---
type: plan
tags: [plan-map, window, bar, hotkeys]
status: done
created: 2026-11-20
updated: 2026-11-20
source: visual plan "Immer im Vordergrund – Schalter", round 1, answered 2026-11-20
---

# Plan – Always on top as a switch

## Outcome

The floaty view's "always on top" can be switched off and on from the bar and by a
hotkey, so floawty can sit behind other windows when it gets in the way. Decision:
[[always-on-top-switch]].

## Constraints

- Touches no service adapter (`src/services/`).
- Test first ([[engineering-standards]] §1); one branch, commit after the maintainer's OK.

## Packages

| # | Package | Outcome | Depends on |
|---|---|---|---|
| 01 | [[on-top-01-switch]] | Bar button 🖈 and Ctrl+Alt+Shift+T switch always on top, remembered | – |

Done 2026-11-20 and archived.
