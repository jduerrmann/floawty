---
type: decision
area: process
tags: [stack, drm, performance]
status: draft
created: 2026-11-16
updated: 2026-11-16
source: conversation
---

# The tech stack is decided by a spike

## Context

Netflix, Prime Video and Disney+ only play where a working DRM module exists
(Widevine, on Windows possibly PlayReady). That decides the stack more than size or
speed – but floawty must also stay light ([[core-principles]] #8). Background:
[[drm-in-desktop-webviews]].

| | Electron (castlabs ECS) | Tauri (WebView2 on Windows) |
|---|---|---|
| DRM | Widevine via castlabs' fork; production needs VMP signing | unclear, must be tested |
| Download size | ~100 MB | ~5–15 MB |
| RAM | higher | lower |
| Always-on-top, opacity, click-through | built in | built in / plugins |
| Playwright | `_electron` | via WebDriver |
| Maintainer experience | – | used in other projects |

## Spike

Throw-away prototypes in `spikes/electron/` and `spikes/tauri/`, never merged as app
code: one frameless always-on-top window, opacity slider, loads a URL. On Windows 11:

1. **Playback:** YouTube, Netflix, Prime Video, Disney+, Twitch – plays? resolution?
2. **Opacity + DRM:** protected video stays visible (not black) below 100 % opacity
   and in click-through mode?
3. **VMP** (Electron): unsigned dev build vs. signed build.
4. **Login persistence** across restarts.
5. **Resources**, measured the same way for both: download size, cold start, RAM and
   CPU idle, RAM and CPU while playing 1080p YouTube, CPU while hidden.
6. **Testability:** one Playwright smoke test opens the picker and selects a service.
7. **Network:** which hosts does the app contact on its own (e.g. a CDM download)?

## Decision

_Open until the spike is done._ Agreed rule: if only one stack plays Netflix **and**
Prime Video reliably below 100 % opacity, it wins. If both do, the lighter one wins.
The concrete resource budgets are recorded here together with the decision.

## Consequences

_Filled in with the decision._ Until then no application code goes into `main`.
