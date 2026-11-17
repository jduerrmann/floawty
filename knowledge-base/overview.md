---
type: note
tags: [product, scope]
status: active
created: 2026-11-16
updated: 2026-11-16
source: conversation
---

# Overview

floawty is a free, open-source desktop app that shows streaming services in a small,
always-on-top overlay window, so people can watch something while they work or play.

## Who it is for

Anyone with an ordinary PC who wants a video in a corner of the screen: download from
GitHub Releases, start, pick a service, watch. No account, no setup.

## Core experience

1. Start floawty → service picker (YouTube, Netflix, Prime Video, Disney+, Twitch,
   custom URL).
2. Pick a service → it opens in the overlay; the user signs in on the official site
   once, the session is remembered.
3. Adjust size, opacity and position; optionally make the overlay click-through.
4. YouTube Shorts: turn on auto mode and it moves to the next Short on its own.

How much UI exists beyond the picker is open ([[open-questions]] #3).

## Scope and non-goals

Scope and out-of-scope list: root `AGENTS.md` rule 9. Principles that never change:
[[core-principles]].

## Phases

| Phase | Content | Status |
|---|---|---|
| 0 | Repository, license, rules, knowledge base | done |
| 1 | Stack spike: Electron (castlabs) vs. Tauri → [[stack-by-spike]] | next |
| 2 | Overlay MVP: window, settings, hotkeys, click-through, picker, YouTube, EN/DE | |
| 3 | YouTube Shorts auto mode, "video only" view | |
| 4 | DRM services: Netflix, Prime Video, Disney+, Twitch | |
| 5 | Release pipeline: CI, portable + installer, update check, OSS code signing | |
| later | macOS and Linux builds, more services | |
