---
type: plan
tags: [plan-map, mvp]
status: active
created: 2026-11-17
updated: 2026-11-17
source: visual plan "MVP-Planung", approved 2026-11-17
---

# Plan – MVP

## Outcome

A floawty the maintainer uses daily: overlay and window mode, hover bar, app tiles,
settings with configurable hotkeys, YouTube Shorts auto mode and "video only" for
YouTube and Netflix, in English and German, within the budgets of [[stack-by-spike]].
Decisions: [[mvp-scope-and-controls]], [[bundled-service-logos]],
[[shared-webview2-profile-in-mvp]], [[webview2-diagnostics-disclosed]].

## Constraints

- Tauri 2 pinned to one minor version, WebView2 with `--disable-background-networking`.
- Test first for pure logic and adapters ([[engineering-standards]] §1–2).
- Prototype code on `spike/sp-03-tauri` may be copied from, but is rewritten to the
  standards, not merged.
- One branch per package (`feat/mvp-NN-…`), commit after the maintainer's OK.

## Packages

| # | Package | Outcome | Depends on |
|---|---|---|---|
| 01 | [[mvp-01-scaffold]] | Tauri + Vite + TS app starts; verify, tests, lint, smoke test run | – |
| 02 | [[mvp-02-overlay-window]] | Overlay geometry, snapping, opacity, click-through with dot, settings file | 01 |
| 03 | [[mvp-03-window-mode]] | Window mode ↔ floaty view with own geometry each | 02 |
| 04 | [[mvp-04-tiles-and-first-start]] | App tiles with logos, custom tiles, first-start notice, services open | 02 |
| 05 | [[mvp-05-bar-settings-i18n]] | Hover bar, settings panel with hotkeys, EN/DE | 03, 04 |
| 06 | [[mvp-06-shorts-auto-mode]] | Shorts move on after one run, configurable | 05 |
| 07 | [[mvp-07-video-only]] | "Video only" for YouTube and Netflix, then the others | 05 |
| 08 | [[mvp-08-measure-and-check]] | Budgets met, all services checked by the maintainer | 06, 07 |

01–04 done and archived. Next candidate: 05.
