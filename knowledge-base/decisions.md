---
type: moc
tags: [decisions]
created: 2026-11-16
updated: 2026-11-18
source: conversation
---

# Decisions

One line per decision record in `decisions/`. Template: `templates/t-decision.md`.

## process

- [[core-principles]] – GPL-3.0, no ads, no server, no tracking, no accounts, fair to services, light on resources
- [[stack-by-spike]] – Tauri 2 on WebView2, Windows only; resource budgets; Electron rejected
- [[webview2-diagnostics-disclosed]] – WebView2's Microsoft connection is disclosed at first start, in PRIVACY and README
- [[rules-and-knowledge-base]] – AGENTS.md as single rule source, knowledge base for everything else
- [[advisor-and-coder-subagents]] – main session leads, coder implements bounded slices, advisor reviews every package

## services

- [[drm-services-in-first-release]] – Netflix, Prime Video, Disney+ and RTL+ ship in the first release
- [[shared-webview2-profile-in-mvp]] – one shared WebView2 profile until Tauri exposes per-service profiles
- [[google-login-honest-user-agent-first]] – Google login is a must; honest user agent first, Chrome only if blocked
- [[widevine-on-demand-with-notice]] – superseded: Widevine comes with WebView2
- [[video-only-lays-player-over-page]] – "video only" covers the page with the player by styles; YouTube and Twitch only
- [[page-scripts-polled-on-title-change]] – floawty asks the page script on title change; service pages never call floawty

## ui

- [[mvp-scope-and-controls]] – MVP scope, bar over the video, window mode ↔ floaty view, Ctrl+Alt+Shift hotkeys, click-through dot
- [[bar-hover-by-cursor-look]] – the bar notices hovering by a 100 ms cursor look while a service is open
- [[own-service-symbols]] – tiles show floawty's own SVG symbols on the brand colour
- [[bundled-service-logos]] – superseded: official logos
- [[overlay-controls]] – hover bar, tiles, settings, hide pauses, Shorts after one run (partly superseded)

## dist

- [[unsigned-first-then-signpath]] – unsigned releases with checksums first, SignPath Foundation signing later
