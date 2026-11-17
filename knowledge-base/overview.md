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

1. Start floawty → the last used service plays in the overlay. First start: app tiles
   with the services' logos plus saved custom URLs, and a cookie-banner-like notice
   about WebView2.
2. The user signs in once in window mode (a normal window), then switches to the
   floaty view (the overlay); the session is remembered.
3. Hovering shows a bar over the video: switch service, opacity, click-through,
   Shorts auto mode, window mode, settings, close. Configurable hotkeys do the same.
4. YouTube Shorts: with auto mode on, the next Short starts after one full run.
5. "Video only" hides the page around the player (YouTube and Netflix first).

Details: [[mvp-scope-and-controls]], [[overlay-controls]]. All services ship in the
first release ([[drm-services-in-first-release]]).

## Scope and non-goals

Scope and out-of-scope list: root `AGENTS.md` rule 9. Principles that never change:
[[core-principles]].

## Phases

| Phase | Content | Status |
|---|---|---|
| 0 | Repository, license, rules, knowledge base | done |
| 1 | Stack spike: Electron (castlabs) vs. Tauri → Tauri ([[stack-by-spike]]) | done |
| 2 | MVP: overlay + window mode, hover bar, tiles, settings, hotkeys, Shorts auto mode, "video only", EN/DE → [[plan-mvp]] | next |
| 3 | Release pipeline: CI, portable + installer, checksums, update check | |
| – | **First public release** after phase 3, with all services | |
| later | SignPath signing, macOS and Linux builds, more services | |
