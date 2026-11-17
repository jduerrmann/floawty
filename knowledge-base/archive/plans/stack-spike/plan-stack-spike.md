---
type: plan
tags: [plan-map, spike, stack]
status: done
created: 2026-11-17
updated: 2026-11-17
source: conversation (visual plan "floawty – Projektplanung", approved 2026-11-17)
---

# Plan – Stack spike

## Outcome

[[stack-by-spike]] is accepted with measured numbers: the stack is chosen, the resource
budgets are set, Google login and on-demand Widevine are proven or ruled out.

## Constraints

- Both prototypes are built and measured completely, the same way.
- Throw-away code under `spikes/`; never imported by app code. Test-first does not
  apply to spikes ([[engineering-standards]] §1); the measurement script is checked
  by running it.
- New tooling (castlabs Electron, Tauri CLI, Playwright) needs the maintainer's OK
  before installation (AGENTS.md rule 5).
- Live checks with DRM services need the maintainer's own accounts and eyes.

## Packages

| # | Package | Outcome | Depends on |
|---|---|---|---|
| 01 | [[sp-01-measurement]] | One script measures RAM, CPU and start time of any app process tree | – |
| 02 | [[sp-02-electron-prototype]] | castlabs Electron overlay that plays all services, measured | 01 |
| 03 | [[sp-03-tauri-prototype]] | Tauri overlay with the same features, measured | 01 |
| 04 | [[sp-04-evaluation]] | Results page, decision accepted, budgets set, MVP plan started | 02, 03 |

All packages done on 2026-11-17; Tauri chosen ([[stack-by-spike]]). Plan archived.
