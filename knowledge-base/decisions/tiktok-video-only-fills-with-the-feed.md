---
type: decision
area: services
tags: [video-only, tiktok, wheel]
status: active
created: 2026-11-21
updated: 2026-11-21
source: maintainer choice after a live check in the built-in browser, 2026-11-21 (package sf-03)
---

# On TikTok, "video only" lets the feed list fill the window

## Context
The plan was to mark the playing item's player with a data attribute and lay it fixed over
the page ([[tiktok-as-short-feed]]), because CSS cannot tell which of TikTok's players plays.
A live check (2026-11-21) showed TikTok's feed is one list `#column-list-container` of
items that TikTok snaps and plays itself, on `/foryou` and on video pages alike. In narrow
windows its items are taller than the window, and the wheel on TikTok's own page stopped
after 65 px.

## Decision
- As on YouTube Shorts ([[shorts-video-only-fills-with-the-list]]): the list is fixed over
  the page at layer 1000 (above TikTok's header at 100, below its dialogs from 2100), and
  each item and its media card are as big as the window. TikTok scrolls, snaps and plays
  the item in view itself; floawty adds no wheel code and no data attribute.
- Under video only only TikTok's volume control, its progress bar and its labels stay on
  the video (maintainer); the action bar beside the video, the creator name, description,
  music and the ⋯ menu are hidden. The volume moves from the top to the bottom left,
  clear of floawty's bar ([[service-own-controls-in-video-only]]).
- Hidden is a short deny list (`display: none`); everything else TikTok lays on the video
  stays, so TikTok's ad label stays visible unless TikTok puts it into the name line or the
  description (maintainer, open question #9). The ad label itself was not seen live: no ad
  in about 70 guest items; it ships as built, and the maintainer checks the first ad seen
  signed in. `display: none` is right here, unlike on watch pages
  ([[video-only-lays-player-over-page]]): nothing is covered, so only removing hides a part.
- TikTok's video pages (`/@user/video/<id>`) are feed pages too: portrait, auto mode and
  video only. Paging there moves the path to each item's own page, so photo pages
  (`/@user/photo/<id>`, assumed) count as well.

## Alternatives
- Mark the playing player and fix it (planned) – a page script that follows media events,
  a fallback before the first playback, and paging by script, which on Shorts showed hard
  cuts.
- Keep TikTok's whole overlay (name, description, music) – no class names needed, but more
  than "video only" (maintainer chose the controls only).
- An allow list as on Shorts (hide all but the way to the video) – would hide an ad label
  TikTok places somewhere new, and an item of an unknown kind entirely.

## Consequences
- Supersedes the marking point of [[tiktok-as-short-feed]].
- The deny list and the volume rule use TikTok's component names inside its generated
  classes (`…--DivCreatorInfoContainer`); a renamed one shows that part again (or leaves the
  volume at the top), without a warning dot. A renamed list or media card turns video
  only off and shows the warning dot.
- Implemented by [[sf-03-tiktok-video-only-and-wheel]].
