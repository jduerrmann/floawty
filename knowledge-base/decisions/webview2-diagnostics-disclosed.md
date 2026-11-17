---
type: decision
area: process
tags: [privacy, network, webview2]
status: active
created: 2026-11-17
updated: 2026-11-17
source: visual plan "Auswertung Testprototyp"; spike results in [[stack-spike-results]]
---

# WebView2's Microsoft connection is disclosed, also at first start

Amends [[core-principles]] #3 and supersedes [[widevine-on-demand-with-notice]].

## Context

floawty runs on WebView2 ([[stack-by-spike]]). With `--disable-background-networking`
the runtime no longer calls Edge's config and error-report services, but its browser
process still opens one HTTPS connection to the Microsoft 365 address range at every
start, outside Chromium's network stack. Microsoft states that WebView2 sends required
diagnostic data regardless of settings; no switch is documented. The Widevine module
also comes with the runtime, so floawty itself downloads nothing.

## Decision

- floawty's own code contacts only the services the user opens and, on request,
  GitHub Releases. The Windows component WebView2 additionally sends diagnostic data
  to Microsoft, as it does for every app that uses it.
- This is said openly in three places: a short notice at the first start (one OK),
  PRIVACY.md and the README.
- The notice and the docs never claim that nothing is sent to Microsoft.

## Alternatives

- Disclose only in PRIVACY.md and README – rejected: users should not be surprised.
- Use Electron to avoid the connection – rejected in [[stack-by-spike]].

## Consequences

- AGENTS.md invariant 3, PRIVACY.md and README are updated.
- The first-start notice needs English and German text and one OK button.
- The spike measurement (`spikes/measure`) is re-run when WebView2 or Tauri changes,
  to notice new connections.
