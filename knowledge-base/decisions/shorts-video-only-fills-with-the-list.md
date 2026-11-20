---
type: decision
area: services
tags: [video-only, shorts, youtube, wheel]
status: active
created: 2026-11-20
updated: 2026-11-20
source: maintainer live test and choice, 2026-11-20 (package sf-01)
---

# On YouTube Shorts, "video only" lets the list of Shorts fill the window

## Context
"Video only" laid the Shorts player fixed over the page ([[video-only-lays-player-over-page]]).
The page beneath was locked, so the wheel did nothing; a page script that scrolled
YouTube's list on each wheel turn worked, but every change showed a hard cut, and for
about 125 ms – while YouTube keeps its player hidden after moving it into the next Short –
the page flashed through (live 2026-11-20). The maintainer wanted YouTube's own swipe.

## Decision
- On Shorts pages the whole list `ytd-shorts #shorts-container` is fixed over the page at
  the video-only layer; its Short boxes and the containers nested down to the player are
  as big as the window. YouTube scrolls, swipes and shows its thumbnail during a change
  itself; the wheel and touchpad reach the list as on YouTube. floawty adds no wheel code.
- On each level of a Short only the way down to the player stays: everything beside it
  gets `content-visibility: hidden` and `pointer-events: none`. YouTube's overlay parts set
  their own `visibility`, so hiding by visibility let buttons and titles show again.
- Nothing that holds the player is ever hidden, so a renamed level shows buttons instead
  of a black window. The Short boxes are the "player" of a Shorts page: without them
  video only stays off and reports `player-missing`.
- Still styles only; ads play in full. The ad card of an ad Short (`#ads-overlay`) stays
  visible over the video (maintainer, 2026-11-20, core principle 7); in YouTube's ad layout
  it also carries like, comment and share.

## Alternatives
- Fixed player plus scrolling the list by script (built and live-tested) – hard cut and a
  125 ms flash of the page; a black layer beneath turned the flash black but no swipe.
- A slide animation of floawty's own – one player only, so the old Short cannot leave.

## Consequences
- Switching video only on or off changes the size of the list, and YouTube lands on the
  neighbouring Short; it does the same on its own page when the window is resized.
- More rules on YouTube's Shorts layout; a renamed box class or container shows the
  warning dot or, at worst, buttons over the video – never a broken page. A renamed
  `#ads-overlay` would hide the ad card again, without a dot.
- TikTok checks the same approach first ([[tiktok-as-short-feed]], sf-03).
- Supersedes for Shorts the "player over the page" part of
  [[video-only-lays-player-over-page]] and its ruling that the Shorts "Sponsored" badge
  may be covered; watch pages keep both.
