---
type: research
tags: [drm, electron, tauri, webview2]
status: active
created: 2026-11-16
updated: 2026-11-16
source: model knowledge, unverified
---

# DRM in desktop webviews

**Verification:** unverified – from model knowledge as of 2026-11-16. The spike in
[[stack-by-spike]] checks every point before anything relies on it.

## Findings

- **Stock Electron** ships no Widevine CDM; DRM services do not play.
- **castlabs Electron for Content Security (ECS)** is an Electron fork that installs
  the Widevine CDM at runtime (a download on first start, via Google's component
  updater). Open source, used by several desktop players.
- **VMP (Verified Media Path):** some services only allow full playback or higher
  resolutions in VMP-signed apps. castlabs offers a signing service (EVS) with a free
  tier, used at build time.
- **WebView2 (Tauri on Windows)** is Edge-based, but DRM support inside WebView2 is
  limited compared to Edge itself; Netflix and Prime Video in WebView2 are reported
  as unreliable.
- **Tauri on macOS** uses WKWebView, on **Linux** WebKitGTK – the latter has no
  Widevine, so DRM services are unlikely to play there.
- **Transparency and hardware DRM:** protected video with hardware-backed DRM may
  render black in layered or transparent windows; software Widevine (L3) usually does
  not.

## Consequences for floawty

- Electron (castlabs) is the likely path for Netflix/Prime, at the cost of size and
  RAM; the spike must quantify that cost.
- The Widevine CDM download contacts a Google host on its own – a conflict with
  [[core-principles]] #3 that needs a decision ([[open-questions]] #4).
- Opacity < 100 % with DRM content is a must-test, not an assumption.
