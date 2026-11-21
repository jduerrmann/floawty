---
type: decision
area: shorts
tags: [tiktok, shorts, video-only, wheel]
status: active
created: 2026-11-20
updated: 2026-11-21
source: visual plan "Shorts-Scrollen und TikTok", rounds 1–3, 2026-11-20
---

# TikTok joins YouTube Shorts as a short feed with one shared auto mode

## Context
The maintainer wants TikTok with the same features as YouTube Shorts: a tile, the auto
mode, a portrait overlay, video only and paging by mouse wheel. Under video only the
wheel did nothing on Shorts, because the page beneath is locked and the player is fixed.

## Decision
- One auto mode for Shorts and TikTok: one bar button ("Auto mode"), one settings
  section ("Shorts and TikTok"); the settings keep `shorts.*`, no format change.
- The auto mode runs from one feed module used by both adapters; each
  adapter supplies its current video, media-start trigger and controls.
- Under video only the wheel pages as on the service's own page: on YouTube the list of
  Shorts fills the window and YouTube swipes itself ([[shorts-video-only-fills-with-the-list]]);
  sf-03 checks the same for TikTok first.
- TikTok's overlay is always portrait on its player pages; landscape videos letterbox.
- TikTok's tile shows floawty's own symbol "T in an upright frame", starts at
  `/foryou` with the auto mode on, and sits after YouTube Shorts.
- Video only on TikTok marks the current player's container with one data attribute,
  because TikTok has one player per feed item and CSS cannot tell which one plays. This
  extends [[video-only-lays-player-over-page]] ("only styles") by one attribute.
- Ads play once in full; whether TikTok's ad label may be covered under video only is
  open ([[open-questions]] #9) – YouTube Shorts keep their ad card visible. Guest dialogs and captchas stay above the video and are never closed or
  bypassed. A photo series moves on once all its pictures were shown or its music (an
  `<audio>` that ends and restarts like a video) has run, whichever comes first
  (maintainer, 2026-11-21, after his tests – first decided as "stays", then music only,
  which took about a minute); a LIVE item has no end, the auto mode stays there.

## Alternatives
- A separate TikTok auto mode – doubles settings and needs a migration.
- The overlay follows each video's shape – the window would jump while scrolling.
- Moving on after a fixed time on LIVE items – needs item-type detection and a setting;
  0 of 20 guest items were such (2026-11-20).

## Consequences
- AGENTS.md rule 9 names the auto mode for Shorts and TikTok and where it lives.
- TikTok's tile is accepted only after the maintainer's live test
  ([[mvp-scope-and-controls]]). Implemented by [[sf-01-wheel-in-video-only]],
  [[sf-02-tiktok-tile-and-auto-mode]], [[sf-03-tiktok-video-only-and-wheel]].
