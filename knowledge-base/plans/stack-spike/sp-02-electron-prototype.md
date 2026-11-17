---
type: plan
tags: [package, spike, electron, drm]
status: planned
created: 2026-11-17
updated: 2026-11-17
source: conversation
---

# sp-02 – Electron (castlabs) prototype

Plan: [[plan-stack-spike]]

## Outcome

A minimal castlabs Electron overlay answers every spike point for Electron with
measured numbers.

## Scope

- Owns: `spikes/electron/`.
- Builds: frameless always-on-top window, opacity slider, click-through hotkey
  (Ctrl+Shift+D), URL field + buttons for each service, one persistent session per
  service, a portable package.
- Non-goals: hover bar design, settings, i18n, adapters, code quality beyond "readable".
- Read first: [[stack-by-spike]], [[drm-in-desktop-webviews]],
  [[widevine-on-demand-with-notice]], [[google-login-honest-user-agent-first]].
- Needs OK: castlabs Electron (`electron` from castlabs' release), packaging tool,
  Playwright.

## Acceptance criteria

- [ ] Playback recorded for YouTube, Twitch, Netflix, Prime Video, Disney+:
      plays yes/no, max resolution seen. Without accounts: a public Widevine demo
      stream proves DRM works at all.
- [ ] DRM video stays visible at 50 % opacity and in click-through mode.
- [ ] VMP: difference between unsigned dev build and EVS-signed build recorded.
- [ ] Google login: honest user agent tried first; result and, if needed, the Chrome
      user agent result recorded.
- [ ] Logins survive a restart.
- [ ] Widevine on demand: the CDM download can (or cannot) wait until a DRM service
      is opened; observed hosts recorded.
- [ ] sp-01 scenarios measured; portable package size recorded.
- [ ] One Playwright `_electron` smoke test opens the window and loads a service.

## Checks

- Results in `spikes/electron/RESULTS.md`, one table, numbers from sp-01 CSVs.
- Logged-in checks (Netflix, Prime, Disney+, Google) need the maintainer: name them.

## Resume here

Not started. Blocked by sp-01 and the OK for the dependencies.
