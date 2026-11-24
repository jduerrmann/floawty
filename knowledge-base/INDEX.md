---
type: moc
tags: [index]
created: 2026-11-16
updated: 2026-11-24
source: conversation
---

# Index – Master map

Entry point for agents and the maintainer. Working rules: root `AGENTS.md`.
Vault conventions and budgets: `CLAUDE.md` in this folder.

## Working on X → read Y

| Task | Read |
|---|---|
| Any code change | [[engineering-standards]] (§1 test first, §3–5 code, §7 resources) |
| App tests, measurements, test tool | [[tech-app-tests]], [[app-tests-run-hidden]] |
| Window, settings, hotkeys | [[tech-window]] |
| Services, tiles, navigation | [[tech-services]] |
| Bar, settings panel, languages, reset, export | [[tech-bar-and-settings]], [[bar-hover-by-cursor-look]], [[settings-export-without-logins]] |
| Multi-session work, resuming | [[active-plans]], [[planning]] |
| A product or scope question | [[overview]], [[core-principles]], [[open-questions]] |
| Stack, DRM, budgets | [[stack-by-spike]], [[idle-budget-260]], [[stack-spike-results]], [[drm-in-desktop-webviews]], [[mvp-measurements]] |
| Privacy, network | [[webview2-diagnostics-disclosed]], [[webview2-component-updates-disclosed]] |
| WebView2 profile | [[shared-webview2-profile-in-mvp]] |
| Release pipeline, next package | [[plan-release]], [[active-plans]] |
| Shorts auto mode, page scripts, TikTok | [[tech-shorts]], [[page-scripts-polled-on-title-change]], [[tiktok-as-short-feed]], [[plan-short-feeds]] |
| "Video only" | [[tech-video-only]], [[video-only-lays-player-over-page]], [[shorts-video-only-fills-with-the-list]] |
| Overlay UI, hotkeys, tiles, Shorts behavior | [[mvp-scope-and-controls]], [[redrawn-service-logos]], [[glass-design-follows-windows-theme]], [[floawty-theme-choice]], [[tiles-tilt-with-light]], [[home-stays-awake-under-a-service]], [[overlay-controls]] |
| Logins, DRM download, network | [[google-login-honest-user-agent-first]], [[widevine-on-demand-with-notice]] |
| Releases, signing, updates | [[release-pipeline]], [[updates-by-tauri-updater]], [[unsigned-first-then-signpath]] |
| Delegating work, independent review | root `CLAUDE.md`, [[advisor-and-coder-subagents]] |
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
- [[isolated-test-input]] – cursor, foreground and hotkeys for app tests without the real screen: test shim DLL (probed)

## Tech

- [[tech-window]] – overlay window, geometry, settings file, hotkeys, local log
- [[tech-services]] – tiles, own pages, service webview, navigation guard, no IPC for services
- [[tech-bar-and-settings]] – hover bar over the service, settings panel, hotkey changes, EN/DE, reset all data
- [[tech-shorts]] – Shorts auto mode, page scripts asked by floawty, turning the overlay
- [[tech-video-only]] – "video only": player over the page by styles, rules for YouTube and Twitch, warning dot
- [[tech-app-tests]] – app tests and measurements on a hidden desktop: launcher, shim, scripts, `@real`
