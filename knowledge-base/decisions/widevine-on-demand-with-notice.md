---
type: decision
area: services
tags: [drm, privacy, network]
status: active
created: 2026-11-17
updated: 2026-11-17
source: conversation (visual plan "floawty – Projektplanung", rounds 1–2)
---

# The Widevine module is downloaded on demand, after a notice

Amends [[core-principles]] #3 (no other network traffic).

## Context

castlabs Electron installs the Widevine CDM by downloading it from a Google host.
That is network traffic the user did not directly ask for, which [[core-principles]]
#3 rules out. Without it, the required DRM services
([[drm-services-in-first-release]]) do not play.

## Decision

- The download is allowed as the only exception to "no other network traffic".
- It happens only when the user first opens a DRM service, after a notice that
  explains what is downloaded, from where and why. Without consent, the DRM service
  does not open; everything else keeps working.
- README and PRIVACY.md state it openly.
- If the stack cannot defer the download, the notice moves to the first start; the
  spike checks this.

## Alternatives

- Download at first start, after a notice – fallback only: users who never watch DRM
  services would contact Google for nothing.
- Avoid the download (no DRM services) – rejected by [[drm-services-in-first-release]].

## Consequences

- AGENTS.md invariant 3 and PRIVACY.md name the exception.
- The notice needs text in English and German.
