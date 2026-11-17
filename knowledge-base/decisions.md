---
type: moc
tags: [decisions]
created: 2026-11-16
updated: 2026-11-17
source: conversation
---

# Decisions

One line per decision record in `decisions/`. Template: `templates/t-decision.md`.

## process

- [[core-principles]] – GPL-3.0, no ads, no server, no tracking, no accounts, fair to services, light on resources
- [[stack-by-spike]] – Tauri 2 on WebView2, Windows only; resource budgets; Electron rejected
- [[webview2-diagnostics-disclosed]] – WebView2's Microsoft connection is disclosed at first start, in PRIVACY and README
- [[rules-and-knowledge-base]] – AGENTS.md as single rule source, knowledge base for everything else

## services

- [[drm-services-in-first-release]] – Netflix, Prime Video, Disney+ and RTL+ ship in the first release
- [[shared-webview2-profile-in-mvp]] – one shared WebView2 profile until Tauri exposes per-service profiles
- [[google-login-honest-user-agent-first]] – Google login is a must; honest user agent first, Chrome only if blocked
- [[widevine-on-demand-with-notice]] – superseded: Widevine comes with WebView2

## ui

- [[overlay-controls]] – hover bar, tiles picker, small settings, Ctrl+Shift hotkeys, hide pauses, Shorts after one run

## dist

- [[unsigned-first-then-signpath]] – unsigned releases with checksums first, SignPath Foundation signing later
