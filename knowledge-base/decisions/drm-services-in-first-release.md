---
type: decision
area: services
tags: [drm, scope, stack]
status: active
created: 2026-11-17
updated: 2026-11-17
source: conversation (visual plan "floawty – Projektplanung", round 1)
---

# Netflix, Prime Video and Disney+ are part of the first release

## Context

DRM services need a Widevine-capable runtime, which likely means a heavier stack
(Electron with castlabs, ~100 MB download instead of ~10 MB). Starting with YouTube
and Twitch only would allow a lighter stack, but might force a stack change later.

## Decision

The first release supports YouTube, Twitch, Netflix, Prime Video, Disney+ and custom
URLs. A stack that cannot play Netflix and Prime Video reliably is not eligible
([[stack-by-spike]]).

Apple TV+, Crunchyroll and RTL+ are candidates (added 2026-11-17): the spike tests
them too. If they play on the chosen stack, they get their own tiles in the first
release; otherwise they stay reachable through the custom URL.

## Alternatives

- YouTube and Twitch first, DRM later – rejected: a later stack change is expensive.
- YouTube first on a DRM-capable stack – rejected: same weight without the benefit.

## Consequences

- Electron (castlabs) is the likely stack; the spike must back this with measured
  numbers for both candidates.
- The Widevine module download needs a notice ([[widevine-on-demand-with-notice]]).
- Live tests need accounts for the DRM services.
