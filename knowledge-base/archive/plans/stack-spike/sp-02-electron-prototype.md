---
type: plan
tags: [package, spike, electron, drm]
status: done
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

- [ ] Playback recorded for YouTube, Twitch, Netflix, Prime Video, Disney+ and the
      candidates Apple TV+, Crunchyroll, RTL+: plays yes/no, max resolution seen.
      A public Widevine demo stream is the cross-check.
- [ ] Ads: YouTube Shorts checked logged out (ads between Shorts), RTL+ checked
      with its ad breaks; the overlay keeps working and never skips an ad.
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

**Done 2026-11-17 – rejected in [[stack-by-spike]].** Code stays on branch `spike/sp-02-electron`,
stacked on `spike/sp-01-measurement`). Details: `spikes/electron/RESULTS.md`.

- Done: prototype (castlabs v45.2.1), portable build 105 MiB, Playwright smoke test
  green, sp-01 scenarios measured (idle 214 MB / ~0 % CPU; YouTube 1080p60 794 MB /
  0.53 % of 32 cores; hidden 622 MB / ~0 %), start 110 ms, Widevine on demand works
  with one restart, VMP Lab: Widevine available, UAT license
  `PLATFORM_SECURE_STORAGE_SOFTWARE_VERIFIED` (dev signature).
- Maintainer, 2026-11-17: **Netflix fails with E100** with both user agents (dev
  signature). Tauri plays Netflix, so EVS signing is only worth it if sp-04 still
  needs Electron.
- Open, needs the maintainer: logged-in playback of the other DRM services and
  candidates, DRM at 50 % opacity and click-through, Google login (honest UA, then
  Chrome UA), login persistence, RTL+ ads, the Widevine consent + restart flow.
- Open, needs a decision: EVS account for VMP signing of the packaged build.
- Fixed: idle traffic to `update.googleapis.com` (component updater) – the app now
  starts with `--disable-component-update` until Widevine consent is given.
