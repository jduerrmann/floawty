---
type: decision
area: process
tags: [stack, drm, performance, tauri]
status: active
created: 2026-11-16
updated: 2026-11-17
source: conversation; spike results in [[stack-spike-results]]; visual plan "Auswertung Testprototyp"
---

# floawty is built with Tauri 2 on WebView2, Windows first

## Context

Netflix, Prime Video and Disney+ must play in the first release
([[drm-services-in-first-release]]), Google sign-in must work
([[google-login-honest-user-agent-first]]) and floawty must stay light
([[core-principles]] #8). Two prototypes – Electron (castlabs ECS v45.2.1) and
Tauri 2.12 (WebView2 157) – were built and measured the same way
([[plan-stack-spike]]). Agreed rule: a stack that cannot play Netflix and Prime
Video below 100 % opacity, or cannot sign in to Google, is out; otherwise the
lighter one wins.

## Decision

- **Tauri 2 with the system WebView2 runtime**, Rust for the shell, TypeScript for
  the UI. **Windows 10/11 only** for now.
- Why: Tauri passed every gate (Netflix 1080p with PlayReady SL3000 hardware DRM,
  Prime Video, Disney+, RTL+, YouTube 1080p60, Google sign-in, picture visible at
  reduced opacity and with click-through). Electron failed Netflix (E100) without a
  castlabs EVS signature. Tauri is also far lighter:

| Metric | Tauri (shared profile) | Electron |
|---|---|---|
| Download | 4.2 MiB | 105 MiB |
| Start → window | 46 ms | 110 ms |
| RAM idle | 188 MB | 214 MB |
| RAM YouTube 1080p60 | 682 MB | 794 MB |
| CPU YouTube 1080p60 | ~0.5 % of 32 cores | ~0.5 % |

- **Resource budgets** (with headroom over the measured values, checked with
  `spikes/measure`): download ≤ 10 MiB; start to visible window ≤ 200 ms; RAM idle
  ≤ 250 MB; RAM playing YouTube 1080p ≤ 850 MB; CPU idle and hidden ≈ 0 %.
- WebView2 always starts with `--disable-background-networking` (plus Tauri's
  default arguments).
- Testing: Playwright over WebView2's debug port.

## Alternatives

- Electron with castlabs ECS – rejected: Netflix fails without EVS signing (needs a
  castlabs account), software Widevine only, 25× the download, a Widevine download
  flow with a restart on v45. Its one advantage – no third-party connection at all –
  is handled by disclosure instead ([[webview2-diagnostics-disclosed]]).

## Consequences

- WebView2 opens one connection to Microsoft per start that cannot be switched off:
  disclosed, see [[webview2-diagnostics-disclosed]]. Widevine comes with the runtime;
  [[widevine-on-demand-with-notice]] is superseded.
- One shared WebView2 profile in the MVP: [[shared-webview2-profile-in-mvp]].
- **Risk: several webviews per window need Tauri's `unstable` feature.** Pin Tauri to
  one minor version; every Tauri upgrade is its own task with the smoke test and the
  live checks.
- **Risk: Microsoft updates WebView2, not floawty.** Log the runtime version at
  start, run the smoke test and the live service checks before every release, and
  document the minimum tested runtime version.
- macOS and Linux are out of scope for now (Linux WebKitGTK has no Widevine).
- Prototype code stays on the branches `spike/sp-02-electron` and `spike/sp-03-tauri`;
  only the measurement script lives in `main`.
