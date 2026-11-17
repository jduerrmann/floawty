---
type: plan
tags: [package, spike, performance]
status: done
created: 2026-11-17
updated: 2026-11-17
source: conversation
---

# sp-01 – Measurement script

Plan: [[plan-stack-spike]]

## Outcome

`spikes/measure/measure.ps1` measures any app the same way, so Electron and Tauri
numbers are comparable. Procedure and scenarios: `spikes/measure/README.md`.

## Scope

- Owns: `spikes/measure/` (script + README with the exact procedure).
- Non-goals: CI integration, charts. A CSV per run is enough.

## Acceptance criteria

- [x] Starts the given executable and reports start time (process start → first
      visible main window), `-Runs` times.
- [x] Sums RAM as private bytes over the whole process tree, including child
      processes. **Deviation:** working set was dropped – summed over a tree it counts
      shared memory many times (Chrome: 9.8 GB working set vs. 2.4 GB private).
      Private working set via WMI took ~7 s per sample, too slow.
- [x] Reports CPU % of the tree per second, normalized to all cores.
- [x] Writes per-second rows to `results/<app>-<scenario>.csv` and median, p95, max
      to `results/<app>-<scenario>-summary.csv`.
- [x] Scenarios `idle`, `youtube-1080p`, `hidden` defined in the README, with a fixed
      CC-licensed test video.
- [x] Lists remote TCP hosts of the tree every 5 s, named via DNS cache or reverse DNS.
      Limit: QUIC (UDP) traffic is not visible.

## Evidence (2026-11-17)

- Chrome, 30 processes: `PrivateMB` 2 427 vs. WMI 2 341 (~3.5 %, the tree also holds
  non-Chrome helpers); CPU 2.5 % vs. WMI 1.8 % (different moments). Hosts showed
  GitHub, Google (1e100.net) and Akamai.
- Start mode with Character Map, 3 runs: 416 / 282 / 295 ms, no leftover processes.
- Process exiting mid-run: warning, partial results written. Unknown PID: clear error.
- Found and fixed: `Get-NetTCPConnection -OwningProcess` silently matches nothing
  for Int32 ids; numbers are written with an invariant `.` decimal separator.
- Not tested: a real Electron or Tauri app (comes with sp-02/sp-03).

## Resume here

Done. Next: [[sp-02-electron-prototype]] or [[sp-03-tauri-prototype]].
