---
type: moc
tags: [index]
created: 2026-11-16
updated: 2026-11-17
source: conversation
---

# Index – Master map

Entry point for agents and the maintainer. Working rules: root `AGENTS.md`.
Vault conventions and budgets: `CLAUDE.md` in this folder.

## Working on X → read Y

| Task | Read |
|---|---|
| Any code change | [[engineering-standards]] (§1 test first, §3–5 code, §7 resources) |
| Window, settings, hotkeys | [[tech-window]] |
| Multi-session work, resuming | [[active-plans]], [[planning]] |
| A product or scope question | [[overview]], [[core-principles]], [[open-questions]] |
| Stack, DRM, budgets | [[stack-by-spike]], [[stack-spike-results]], [[drm-in-desktop-webviews]] |
| Privacy, network, WebView2 | [[webview2-diagnostics-disclosed]], [[shared-webview2-profile-in-mvp]] |
| MVP work, next package | [[plan-mvp]], [[active-plans]] |
| Overlay UI, hotkeys, tiles, Shorts behavior | [[mvp-scope-and-controls]], [[bundled-service-logos]], [[overlay-controls]] |
| Logins, DRM download, network | [[google-login-honest-user-agent-first]], [[widevine-on-demand-with-notice]] |
| Releases, signing | [[unsigned-first-then-signpath]] |
| Writing a note | `CLAUDE.md` in this folder, `templates/` |

## Product

- [[overview]] – what floawty is, who it is for, the core experience and phases
- [[decisions]] – MOC of all decision records
- [[open-questions]] – unresolved questions; search before asking

## Rules

- [[engineering-standards]] – test first, test levels, readable code, comments, size limits, resources, security
- [[planning]] – visual plan → plan map → packages with "Resume here"

## Research

- [[stack-spike-results]] – measured numbers and service checks for Tauri and Electron
- [[drm-in-desktop-webviews]] – Widevine/PlayReady in castlabs Electron and WebView2 (mostly observed)

## Tech

- [[tech-window]] – overlay window, geometry, settings file, hotkeys, local log
