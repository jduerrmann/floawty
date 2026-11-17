---
type: plan
tags: [package, spike, tauri, drm]
status: done
created: 2026-11-17
updated: 2026-11-17
source: conversation
---

# sp-03 – Tauri prototype

Plan: [[plan-stack-spike]]

## Outcome

A minimal Tauri overlay (WebView2) answers every spike point for Tauri with measured
numbers, comparable to sp-02.

## Scope

- Owns: `spikes/tauri/`.
- Builds the same feature set as sp-02: frameless always-on-top window, opacity,
  click-through hotkey, URL field + service buttons, persistent session per service,
  a portable build.
- Non-goals: same as sp-02.
- Read first: [[stack-by-spike]], [[drm-in-desktop-webviews]],
  [[google-login-honest-user-agent-first]].
- Rust toolchain is installed (cargo 1.96). Needs OK: Tauri CLI and plugins,
  tauri-driver for WebDriver.

## Acceptance criteria

- [ ] Playback recorded for YouTube, Twitch, Netflix, Prime Video, Disney+, the
      candidates Apple TV+, Crunchyroll, RTL+ and the public Widevine demo stream:
      plays yes/no, max resolution seen.
- [ ] Ads: same checks as sp-02 (YouTube Shorts logged out, RTL+ ad breaks).
- [ ] DRM video (if it plays) stays visible at 50 % opacity and in click-through mode.
- [ ] Google login: honest user agent first, then Chrome user agent if blocked.
- [ ] Logins survive a restart.
- [ ] sp-01 scenarios measured, including the `msedgewebview2.exe` processes; build
      size recorded.
- [ ] One WebDriver smoke test (tauri-driver) opens the window and loads a service.

## Checks

- Results in `spikes/tauri/RESULTS.md`, same table layout as sp-02.
- Logged-in checks need the maintainer: name them.

## Resume here

**Done 2026-11-17 – chosen in [[stack-by-spike]].** Code stays on branch `spike/sp-03-tauri`,
stacked on `spike/sp-02-electron`). Details: `spikes/tauri/RESULTS.md`.

- Done: prototype (Tauri 2.12, WebView2 157), exe 4.2 MiB, Playwright smoke test over
  the WebView2 debug port green, sp-01 scenarios measured (idle 302 MB; YouTube
  1080p60 845 MB / 0.41 % of 32 cores; hidden 765 MB), start 46 ms. Widevine is
  supplied by WebView2 (VMP Lab UAT license `..._SOFTWARE_VERIFIED`). **Netflix plays**
  (maintainer, logged in) – Electron fails with E100 without EVS signing.
- Maintainer, 2026-11-17: Netflix 1080p HEVC with PlayReady SL3000 (hardware DRM),
  visible at reduced opacity and with click-through; Disney+, Prime Video and RTL+
  (with ad breaks) play; YouTube 1080p60 and Google sign-in work with the default
  user agent; logins survive a restart. **All gate criteria of [[stack-by-spike]]
  are met.**
- Moved to the MVP: Twitch, Apple TV+, Crunchyroll tests.
- Done: `--disable-background-networking` stops the idle calls to
  `config.edge.skype.com` and `ecs.nel.measure.office.net`; DRM still works. One
  HTTPS connection per start to the Microsoft 365 range remains, outside Chromium's
  network stack, not switchable – decision for sp-04 (invariant 3/4).
- Done: shared WebView2 environment (`--shared-profile`) cuts RAM to 188 MB idle /
  682 MB playing (below Electron), at the cost of one cookie store; per-service
  profiles would need Tauri to expose WebView2 profiles (wry has them).
- tauri-driver was not needed; Playwright connects over CDP.
