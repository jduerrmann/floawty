---
type: decision
area: services
tags: [sessions, webview2, performance]
status: active
created: 2026-11-17
updated: 2026-11-17
source: visual plan "Auswertung Testprototyp"; spike results in [[stack-spike-results]]
---

# All services share one WebView2 profile in the MVP

## Context

A separate WebView2 data directory per service starts an extra browser process:
299 MB RAM idle and 838 MB playing YouTube, against 188 MB and 682 MB with one shared
environment. Separate sessions inside one environment need WebView2 profiles, which
wry supports (`with_profile_name`) but Tauri 2.12 does not expose.

## Decision

- The control bar and every service run in one WebView2 environment with one
  persistent profile, like a normal browser.
- As soon as Tauri exposes WebView2 profiles, floawty switches to one profile per
  service. Users then sign in once more.

## Alternatives

- One data directory per service – rejected for now: +110–155 MB RAM against
  [[core-principles]] #8.

## Consequences

- Services share one cookie store; "Reset all data" still wipes everything.
- AGENTS.md rule 8 says "one shared profile (MVP)" instead of "one session per service".
