---
type: plan
tags: [package, spike, performance]
status: ready
created: 2026-11-17
updated: 2026-11-17
source: conversation
---

# sp-01 – Measurement script

Plan: [[plan-stack-spike]]

## Outcome

`spikes/measure/measure.ps1` measures any app the same way, so Electron and Tauri
numbers are comparable.

## Scope

- Owns: `spikes/measure/` (script + short README with the exact procedure).
- Non-goals: CI integration, charts. A CSV per run is enough.
- Read first: [[stack-by-spike]] (spike points 7 and 9), [[engineering-standards]] §7.

## Acceptance criteria

- [ ] Starts the given executable and reports **cold start** (process start → main
      window visible).
- [ ] Sums **RAM** (private bytes and working set) over the whole process tree,
      including child processes such as `msedgewebview2.exe` or Electron helpers.
- [ ] Reports **CPU %** of the process tree, sampled every second, normalized to all
      cores.
- [ ] Runs a named scenario for a fixed time and writes one CSV row per sample plus
      a summary (median, p95) to `spikes/measure/results/<app>-<scenario>.csv`.
- [ ] Scenarios: `idle` (blank page), `youtube-1080p` (fixed public test video,
      playing), `hidden` (overlay hidden, video paused), 60 s each.
- [ ] Lists the remote hosts the process tree connects to during a run
      (`Get-NetTCPConnection` + DNS cache), for spike point 9.

## Checks

- Run against a known app (e.g. Notepad and Edge) and compare with Task Manager;
  RAM within ~10 %, CPU plausible.
- Results folder is git-ignored except a sample file.

## Resume here

Not started. First step: write the process-tree helper (Win32_Process
ParentProcessId recursion) and verify it against Edge.
