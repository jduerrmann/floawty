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
- [[stack-by-spike]] – Electron (castlabs) vs. Tauri decided by a DRM/resource spike (draft)
- [[rules-and-knowledge-base]] – AGENTS.md as single rule source, knowledge base for everything else

## services

- [[drm-services-in-first-release]] – Netflix, Prime Video and Disney+ ship in the first release
- [[widevine-on-demand-with-notice]] – Widevine downloads only when a DRM service is first opened, after a notice
- [[google-login-honest-user-agent-first]] – Google login is a must; honest user agent first, Chrome only if blocked

## ui

- [[overlay-controls]] – hover bar, tiles picker, small settings, Ctrl+Shift hotkeys, hide pauses, Shorts after one run

## dist

- [[unsigned-first-then-signpath]] – unsigned releases with checksums first, SignPath Foundation signing later
