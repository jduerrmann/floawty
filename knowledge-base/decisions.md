---
type: moc
tags: [decisions]
created: 2026-11-16
updated: 2026-11-22
source: conversation
---

# Decisions

One line per decision record in `decisions/`. Template: `templates/t-decision.md`.

## process

- [[core-principles]] – GPL-3.0, no ads, no server, no tracking, no accounts, fair to services, light on resources
- [[stack-by-spike]] – Tauri 2 on WebView2, Windows only; resource budgets; Electron rejected
- [[webview2-diagnostics-disclosed]] – WebView2's Microsoft connection is disclosed at first start, in PRIVACY and README
- [[webview2-component-updates-disclosed]] – WebView2's component updater (DRM module) stays on and is disclosed too
- [[rules-and-knowledge-base]] – AGENTS.md as single rule source, knowledge base for everything else
- [[advisor-and-coder-subagents]] – main session leads, coder implements bounded slices, advisor gives the independent reviews ([[leaner-reviews]])
- [[leaner-reviews]] – advisor at effort high with a reading budget; one independent review per UI plan, plan check only if hard to reverse
- [[app-tests-ask-first]] – app tests only after the maintainer's yes, muted, one agent at a time; `npm run check` while working
- [[app-runs-smallest-first]] – red specs first, then all app tests, measurement last; one yes for repeated targeted runs
- [[idle-budget-260]] – idle RAM ≤ 260 MB instead of 250; median of three when one value is over

## services

- [[drm-services-in-first-release]] – Netflix, Prime Video, Disney+ and RTL+ ship in the first release
- [[shared-webview2-profile-in-mvp]] – one shared WebView2 profile until Tauri exposes per-service profiles
- [[google-login-honest-user-agent-first]] – Google login is a must; honest user agent first, Chrome only if blocked
- [[widevine-on-demand-with-notice]] – superseded: Widevine comes with WebView2
- [[video-only-lays-player-over-page]] – "video only" covers the page with the player by styles; YouTube, Twitch, Crunchyroll
- [[passkey-prompts-left-to-the-service]] – passkey dialogs come from the services (Amazon too in Edge); floawty leaves them
- [[page-scripts-polled-on-title-change]] – floawty asks the page script on title change; service pages never call floawty
- [[floawty-ui-never-framed]] – CSP `frame-ancestors 'none'`: no service page can frame floawty's own pages to call commands
- [[graphics-acceleration-switch]] – "Use graphics acceleration" off starts WebView2 with --disable-gpu; asks, then restarts

## ui

- [[mvp-scope-and-controls]] – MVP scope, bar over the video, window mode ↔ floaty view, Ctrl+Alt+Shift hotkeys, click-through dot
- [[settings-export-without-logins]] – export/import carries settings, own tiles and hotkeys, never logins or profile files
- [[always-on-top-switch]] – 🖈 and Ctrl+Alt+Shift+T switch the floaty view's always on top; stored; click-through keeps it on top
- [[bar-hover-by-cursor-look]] – the bar notices hovering by a 100 ms cursor look while a service is open
- [[overlay-shape-free-with-zoom]] – any overlay shape (magnets 16:9, 12:5); zoom switch fills a wide overlay
- [[overlay-snaps-flush]] – the overlay snaps flush to corners and edges, no 16 px margin
- [[bar-leaves-the-page-clickable]] – bar above the page in window mode, only as wide as its controls over a service
- [[own-service-symbols]] – superseded: own SVG symbols on the brand colour
- [[animations-switch]] – one switch turns all floawty animations off, glow stays; default on
- [[first-start-notice-over-tiles]] – the notice is a centred card over inert tiles until OK
- [[redrawn-service-logos]] – tiles show redrawn service logos with glass effects; trademarks kept apart from GPL, NOTICE
- [[glass-design-follows-windows-theme]] – one glass design for home, settings and bar; follows Windows light/dark; cyan accent
- [[floawty-theme-choice]] – floawty's own light/dark (default like Windows), title bar via DWM, never Tauri's theme API
- [[tiles-tilt-with-light]] – tiles tilt 7° under a moving light, never outside their box; no loop
- [[home-stays-awake-under-a-service]] – non-goal: no sleeping home under a service; saves only ~3 MB on real WebView2
- [[bundled-service-logos]] – superseded: official logos
- [[overlay-controls]] – hover bar, tiles, settings, hide pauses, Shorts after one run (partly superseded)

## dist

- [[unsigned-first-then-signpath]] – unsigned releases with checksums first, SignPath Foundation signing later
- [[release-pipeline]] – CI checks every PR; a tag after local checks publishes setup, portable and SHA256SUMS at once
- [[updates-by-tauri-updater]] – updates by click or, if turned on, automatically on quit; portable only links to the release
