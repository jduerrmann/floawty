---
type: plan
tags: [package, mvp, window, services]
status: done
created: 2026-11-18
updated: 2026-11-20
source: visual plan "mvp-11 Grafikbeschleunigung", round 1, answered 2026-11-18
---

# mvp-11 – Graphics acceleration can be switched off

Plan: [[plan-mvp]]

## Outcome
A setting "Use graphics acceleration" (on by default) lets the user switch WebView2's GPU
off, e.g. so a Discord screen share shows Crunchyroll, which stays black with the GPU
(in Edge it works with acceleration off).

## Decided (visual plan, 2026-11-18)
- Name like Edge's: "Use graphics acceleration" / „Grafikbeschleunigung verwenden",
  with a short note: needs more CPU, DRM services may play in lower quality.
- Switching asks "Restart floawty now?" and restarts; the browser arguments of the one
  shared WebView2 environment are fixed at start (maintainer asked whether it could
  act directly: no, recreating all webviews would be a restart in disguise).
- Default on; only in the settings, not in the bar; budgets apply with it on.

## Facts so far
- YouTube 1080p, 30 s, 32 cores: with GPU 0.39 % CPU / 755 MB, without (`--disable-gpu`)
  1.63 % CPU / 611 MB, both ~63 fps at 1080p.
- Probe with `--disable-gpu` (release build, fresh profile, 2026-11-18): window opacity
  (layered window), the transparent bar over a service, the opacity slider (30–100 %),
  the click-through dot and window mode look the same as with the GPU (screenshots,
  bar pixels counted per step, two runs). A first probe saw an invisible bar; that was
  the bar's own 3 s idle hide (`hover.rs`) outrunning a ~2 s PowerShell screenshot,
  not the GPU. Probes must move the cursor right before each screenshot.
- DRM per switch (EME `requestMediaKeySystemAccess`, example.com): with the GPU
  PlayReady SL3000 and SL2000 are offered; `--disable-gpu` and
  `--disable-gpu-compositing` offer **no PlayReady at all**;
  `--disable-accelerated-video-decode` drops only SL3000. So without the GPU, Netflix
  and the other PlayReady services fall back to Widevine (if downloaded) and may play
  in lower quality.

## Acceptance criteria
- [x] Setting with note, EN/DE; switching asks and restarts; stored in settings.json.
- [x] Main, bar and service webviews start with `--disable-gpu` when it is off (one
      source, `service::browser_args`; `tauri.conf.json` sets none).
- [x] Bar visible and usable without the GPU; opacity and click-through work.
- [x] Maintainer: Crunchyroll visible in a Discord stream; Netflix, Prime Video,
      Disney+, RTL+ checked without the GPU (quality noted).
- [x] Decision recorded ([[graphics-acceleration-switch]]); notes, CHANGELOG;
      measurement; independent review.

## Evidence (2026-11-18)
- Tests first: Rust `browser_args` on/off and the setting (default, old files, round
  trip) red, then green. Playwright: `settings.spec.ts` (switch asks, Cancel keeps it,
  Restart saves it and the new floawty logs "graphics acceleration is off");
  `graphics-acceleration.spec.ts` (release exe without the argument override: the
  WebView2 browser process has `--disable-gpu` exactly when off, bar and reopened local
  service start; a second floawty with other arguments logs "could not create the main
  window").
- `npm run verify` green (Vitest 68, cargo 108, clippy, Playwright 92, build) before
  the review fixes, and again after them (Vitest 68, cargo 107, Playwright 93).
- `npm run measure` (acceleration on): 3.3 MiB, start 32 ms, idle 234 MB / 0 %,
  YouTube 1080p 722 MB / 0.48 % CPU at 62 fps, hidden 725 MB / 0.05 %; idle network
  one Microsoft host (2620:1ec:33::11), as before. All budgets met.
- Restart race: 8 simulated restarts (new process started, old one killed at once)
  alternating on/off, all came up with the right arguments.
- Panel looked at in German, with and without the restart question.
- Review: `advisor` (Fable 5.2). Restart race → measured, none; second instance
  crashes silently → now logged, single instance is open question 6; restart test
  blind → waits for the new process's log line; fixed sleep → local page polled;
  `settings.rs` over 400 lines → tests merged (397); question not tied to buttons →
  `role="group"` with `aria-labelledby`; stale docs → fixed.

- Maintainer check with the switch off (2026-11-20): Crunchyroll visible in a Discord
  stream; Netflix, Prime Video, Disney+ and RTL+ play without problems (quality not
  noted separately).

## Resume here
Done 2026-11-20 and archived. Open question 6 (single instance) stays independent.
