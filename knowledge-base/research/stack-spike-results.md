---
type: research
tags: [spike, stack, performance, drm, network]
status: active
created: 2026-11-17
updated: 2026-11-17
source: measurements with spikes/measure and maintainer tests, 2026-11-17
---

# Stack spike results

**Verification:** measured on 2026-11-17 (Windows 11, 32 logical cores) with
`spikes/measure`; service checks by the maintainer with real accounts. Full detail
and prototype code: `RESULTS.md` on the branches `spike/sp-02-electron` (castlabs
Electron v45.2.1) and `spike/sp-03-tauri` (Tauri 2.12, WebView2 157). Decision:
[[stack-by-spike]].

## Resources (medians, p95 in brackets)

| Metric | Tauri shared profile | Tauri profile per service | Electron |
|---|---|---|---|
| Download | 4.2 MiB | 4.2 MiB | 105 MiB |
| Start → visible window | 46 ms | 46 ms | 110 ms |
| RAM idle | 188 MB | 299 MB | 214 MB |
| RAM YouTube 1080p60 | 682 MB (760) | 838 MB (920) | 794 MB (902) |
| RAM hidden, paused | 659 MB | 722 MB | 622 MB |
| CPU YouTube 1080p60 | 0.55 % of all cores | 0.52 % | 0.53 % |
| CPU idle / hidden | ≈ 0 % | ≈ 0 % | ≈ 0 % |

All YouTube runs played 1920 × 1080 at ~60 fps in the 480 × 270 overlay at 70 %
opacity (checked by an in-page probe). RAM is private bytes of the whole process tree.

## Services (maintainer, logged in)

| Service | Tauri | Electron |
|---|---|---|
| Netflix | 1080p HEVC, PlayReady SL3000; visible at reduced opacity and with click-through | error E100 (no production VMP signature) |
| Prime Video, Disney+, RTL+ (with ads) | play | not tested |
| YouTube (Google sign-in) | 1080p60, sign-in works | not tested |
| Logins after restart | kept | not tested |
| Twitch, Apple TV+, Crunchyroll | not yet tested | not tested |

## Network while idle

- Electron: contacted `update.googleapis.com` (component updater) until started with
  `--disable-component-update`; then no internet host.
- Tauri/WebView2: `config.edge.skype.com` and `ecs.nel.measure.office.net` until
  started with `--disable-background-networking`; one HTTPS connection per start to
  the Microsoft 365 range remains, from the WebView2 browser process outside
  Chromium's network stack.

## Lessons for the app

- Tauri: several webviews per window need the `unstable` feature; opening webviews
  in sync commands deadlocks (use async); no opacity API (layered Win32 window
  works); `additional_browser_args` replaces Tauri's defaults.
- YouTube: a fresh profile shows a cookie banner that blocks playback; quality
  requests can be ignored, so measurements must check what really plays.
- Playwright drives WebView2 over `--remote-debugging-port`; no tauri-driver needed.
