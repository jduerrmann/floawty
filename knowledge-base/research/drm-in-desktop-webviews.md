---
type: research
tags: [drm, electron, tauri, webview2]
status: active
created: 2026-11-16
updated: 2026-11-17
source: castlabs docs (github.com/castlabs/electron-releases, read 2026-11-17); spike tests 2026-11-17
---

# DRM in desktop webviews

**Verification:** the points marked *observed* were checked in the stack spike on
Windows 11 ([[stack-spike-results]]); *documented* ones come from castlabs' docs;
the rest is unverified.

## Findings

- **Stock Electron** ships no Widevine CDM; DRM services do not play. *(documented)*
- **castlabs ECS v45** downloads the Widevine CDM from Google within ~30 s of every
  start unless `components.updatesEnabled = false`; the flag is read only at
  startup, so consent needs one restart. ECS v46 (alpha in 11/2026) installs nothing
  until `components.start()`/`whenReady()`. *(observed / documented)*
- **VMP:** castlabs' dev signature gets UAT licenses
  (`PLATFORM_SECURE_STORAGE_SOFTWARE_VERIFIED`), but **Netflix rejects it (E100)**;
  production needs castlabs EVS signing (free, account required). Packaging renames
  and patches the exe, so the shipped signature no longer matches. *(observed)*
- **WebView2 (Tauri on Windows)** has Widevine (CDM 4.10.3050.0 from the runtime)
  **and PlayReady**: Netflix uses `com.microsoft.playready.recommendation.3000`
  (SL3000, hardware) and plays 1080p. Prime Video, Disney+ and RTL+ play too.
  *(observed)*
- **Opacity:** protected Netflix video stays visible in a layered (semi-transparent)
  WebView2 window and with click-through. *(observed)*
- **Tauri on macOS** uses WKWebView, on **Linux** WebKitGTK – the latter has no
  Widevine, so DRM services are unlikely to play there. *(unverified)*

## Consequences for floawty

- Tauri on WebView2 is the chosen stack ([[stack-by-spike]]); floawty downloads no
  DRM module ([[webview2-diagnostics-disclosed]]).
- Linux support would need a different answer for DRM.
