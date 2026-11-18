---
type: decision
area: process
tags: [privacy, network, webview2, drm]
status: active
created: 2026-11-18
updated: 2026-11-18
source: mvp-08 idle network measurement; maintainer, 2026-11-18
---

# WebView2's component updates stay on and are disclosed

Amends [[webview2-diagnostics-disclosed]] and [[core-principles]] #3.

## Context

The mvp-08 measurement found a second Microsoft connection while idle: about 55 s
after start, WebView2's network service asks `edge.microsoft.com/componentupdater`
for updates of its built-in components; `--disable-background-networking` does not
stop it. The updater keeps the Widevine DRM module current in the profile (the
maintainer's profile holds 4.10.3112.0, the runtime ships 4.10.3050.1); a fresh profile
gets it within five minutes through BITS from `msedge.b.tlu.dl.delivery.mp.microsoft.com`.
With `--disable-component-update` the connection is gone, but Widevine is no longer
available at all, not even the bundled one; PlayReady (Netflix) still is. Which of
Prime Video, Disney+ and RTL+ need Widevine in WebView2 is unknown.

## Decision

- Component updates stay on; floawty adds no switch against them.
- They are disclosed next to the diagnostic data, in the same three places: the
  first-start notice, PRIVACY.md and the README.

## Alternatives

- `--disable-component-update` – rejected: removes Widevine and could break DRM
  services; it would need a retest of every service and leaves the DRM module unpatched.
- Keep it undisclosed as part of "diagnostic data" – rejected: it is a different
  connection and it downloads code, so users should be told plainly.

## Consequences

- The notice text, PRIVACY.md, README and AGENTS.md invariant 3 name both connections.
- The measuring driver ([[mvp-measurements]]) lists idle hosts; a third connection
  means a new decision.
