---
type: plan
tags: [package, spike, tauri, drm]
status: planned
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

- [ ] Playback recorded for YouTube, Twitch, Netflix, Prime Video, Disney+ and the
      public Widevine demo stream: plays yes/no, max resolution seen.
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

Not started. Blocked by sp-01 and the OK for the dependencies.
