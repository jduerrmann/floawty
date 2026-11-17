---
type: note
tags: [product, scope]
status: active
created: 2026-11-16
updated: 2026-11-17
source: conversation
---

# Overview

floawty is a free, open-source desktop app that shows streaming services in a small,
always-on-top overlay window, so people can watch something while they work or play.

## Who it is for

Anyone with an ordinary PC who wants a video in a corner of the screen: download from
GitHub Releases, start, pick a service, watch. No account, no setup.

## Core experience

1. Start floawty → the last used service plays in the overlay (first start: service
   tiles for YouTube, Netflix, Prime Video, Disney+, Twitch, custom URL).
2. The user signs in on the official site once; the session is remembered.
3. Hovering shows a bar: switch service, opacity, click-through, Shorts auto mode,
   settings, close. Hotkeys do the same without the mouse.
4. YouTube Shorts: with auto mode on, the next Short starts after one full run.

Details: [[overlay-controls]]. All services ship in the first release
([[drm-services-in-first-release]]).

## Scope and non-goals

Scope and out-of-scope list: root `AGENTS.md` rule 9. Principles that never change:
[[core-principles]].

## Phases

| Phase | Content | Status |
|---|---|---|
| 0 | Repository, license, rules, knowledge base | done |
| 1 | Stack spike: Electron (castlabs) vs. Tauri → [[plan-stack-spike]] | next |
| 2 | Overlay MVP: window, hover bar, settings, hotkeys, click-through, tiles, YouTube, EN/DE | |
| 3 | YouTube Shorts auto mode, "video only" view | |
| 4 | DRM services: Netflix, Prime Video, Disney+, Twitch | |
| 5 | Release pipeline: CI, portable + installer, checksums, update check | |
| – | **First public release** after phase 5, with all services | |
| later | SignPath signing, macOS and Linux builds, more services | |
