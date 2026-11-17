---
type: decision
area: process
tags: [stack, drm, performance]
status: draft
created: 2026-11-16
updated: 2026-11-17
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

Both prototypes are built and measured completely, so the decision rests on numbers
(plan: [[plan-stack-spike]]). Throw-away code in `spikes/electron/` and
`spikes/tauri/`, never merged as app code: one frameless always-on-top window, opacity
slider, click-through hotkey, loads a service URL in a persistent session. On
Windows 11:

1. **Playback:** YouTube, Netflix, Prime Video, Disney+, Twitch and the candidates
   Apple TV+, Crunchyroll, RTL+ – plays? resolution? Ads handled?
2. **Opacity + DRM:** protected video stays visible (not black) below 100 % opacity
   and in click-through mode?
3. **VMP** (Electron): unsigned dev build vs. signed build.
4. **Google login** ([[google-login-honest-user-agent-first]]): honest user agent,
   then Chrome user agent if blocked. Must work.
5. **Login persistence** across restarts.
6. **Widevine on demand** ([[widevine-on-demand-with-notice]]): can the CDM download
   wait until a DRM service is opened?
7. **Resources**, measured the same way for both: download size, cold start, RAM and
   CPU idle, RAM and CPU while playing 1080p YouTube, CPU while hidden.
8. **Testability:** one Playwright smoke test opens the window and loads a service.
9. **Network:** which hosts does the app contact on its own?

## Decision

_Open until the spike is done._ Agreed rule: a stack that cannot play Netflix **and**
Prime Video reliably below 100 % opacity, or cannot sign in to Google, is out
([[drm-services-in-first-release]]). If both qualify, the lighter one wins. The
concrete resource budgets are recorded here together with the decision.

## Consequences

_Filled in with the decision._ Until then no application code goes into `main`.
