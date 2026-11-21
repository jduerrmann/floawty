---
type: plan
tags: [plan-map, shorts, tiktok]
status: active
created: 2026-11-20
updated: 2026-11-21
source: visual plan "Shorts-Scrollen und TikTok", rounds 1–3, 2026-11-20; advisor plan check
---

# Plan – Short feeds: wheel in video only, TikTok, sign-in window

## Outcome
Short videos page like on the services' own pages: the mouse wheel over a Short in
"video only" goes to the next or previous Short; TikTok gets a tile with its own
symbol, the shared auto mode, a portrait overlay, "video only" and the same wheel; its
sign-in with Google, Apple or Facebook works in a small sign-in window. Ships in 0.1.0.
Decisions: [[sign-in-window-for-popups]], [[tiktok-as-short-feed]],
[[shorts-video-only-fills-with-the-list]].

## Decided (visual plan, 2026-11-20)
- Under video only the wheel pages as on the service's own page. YouTube: the list of
  Shorts fills the window and YouTube swipes itself (maintainer, 2026-11-20, after a fixed
  player with scripted list scrolling showed hard cuts;
  [[shorts-video-only-fills-with-the-list]]).
- One auto mode for Shorts and TikTok: bar button "Auto mode", settings section
  "Shorts and TikTok"; settings keep `shorts.*`, no format change.
- TikTok: portrait on its player pages; own symbol "T in an upright frame"; start
  `https://www.tiktok.com/foryou`, turns the auto mode on, tile after YouTube Shorts.
- Video only on TikTok's feed and single video pages; the page script marks the
  current player's container with one data attribute.
- Ads play once in full. On YouTube Shorts the ad card stays visible under video only
  ([[shorts-video-only-fills-with-the-list]]); for TikTok's ad label see [[open-questions]] #9.
- Guest dialogs and captchas stay above the video; floawty never closes or bypasses them.
- A photo series moves on once all its pictures were shown or its music has run,
  whichever comes first (changed 2026-11-21 after the maintainer's tests); a LIVE item has
  no end, the auto mode stays until the user scrolls.
- Sign-in window: see [[sign-in-window-for-popups]]. Off-list links inside it do
  nothing (host-only log line); the feed keeps running behind it.
- AGENTS.md rule 9 names the auto mode for Shorts and TikTok and the sign-in window;
  coordinated with [[rel-05-settings-export]], which edits the same line.

## Constraints
- New service: the TikTok tile is accepted only after the maintainer's live test
  ([[mvp-scope-and-controls]]); each package's acceptance includes its live test.
- Live facts so far come from a Chromium browser, not WebView2; each package
  re-checks its facts in floawty first.
- Shared with the release plan ([[plan-release]]): `settings.rs`/`persistence.rs`
  (rel-05 owns compatibility; sf-04 adds one `#[serde(default)]` field), `src/i18n.ts`
  (one owner at a time), AGENTS.md rule 9, `src-tauri/capabilities/main.json` (rel-03).
  Only one agent at a time builds the release app or runs Playwright.
- Index notes ([[active-plans]], [[decisions]], [[INDEX]]) are edited after the release
  session has committed its changes to them.

## Packages

| # | Package | Outcome | Depends on |
|---|---|---|---|
| 01 | [[sf-01-wheel-in-video-only]] | Under video only the Shorts list fills the window; wheel and swipe page as on YouTube | – |
| 02 | [[sf-02-tiktok-tile-and-auto-mode]] | TikTok tile and symbol, shared feed module, auto mode, portrait, "Auto mode" labels | 01 |
| 03 | [[sf-03-tiktok-video-only-and-wheel]] | Video only and the wheel on TikTok | 02 |
| 04 | [[sf-04-sign-in-window]] | Sign-in pop-ups of a service open a small owned window in the shared profile | – |

01 done and archived (2026-11-20). 02 → 03 in order; 04 is independent but shares TikTok's manifest with 02 (04
writes `signInHosts`). Next: sf-02.
