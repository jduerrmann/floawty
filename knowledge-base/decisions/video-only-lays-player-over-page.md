---
type: decision
area: services
tags: [video-only, page-script, ads]
status: active
created: 2026-11-18
updated: 2026-11-18
source: visual plan "mvp-07 Nur Video", round 1, approved 2026-11-18
---

# "Video only" lays the service's player over its own page with styles

## Context
In the small overlay YouTube and Twitch show their header, suggestions, comments and
chat; the video is only a part of the view. Netflix, Prime Video, Disney+ and RTL+
already show only their player while playing.

## Decision
- The adapter's page script adds a class to `<html>` and a style element whose rules
  put the player `position: fixed` over the whole page, below the service's own
  dialogs (cookie consent, "continue watching?"). Nothing is removed or rewritten;
  page scrolling is locked while it applies.
- Own rules only for YouTube (watch pages and Shorts) and Twitch (channels, videos);
  the other services are only checked live.
- One saved switch for all services (▣ in the bar, Ctrl+Alt+Shift+V); it applies only
  in the floaty view, window mode always shows the whole page.
- Covering the page's ad slots next to the video is not ad blocking (maintainer,
  2026-11-18): they still load and render beneath; ads in the player stay untouched.
- Shorts: the action bar and the next control are covered, not removed, so the auto
  mode still clicks YouTube's own next control. Ad Shorts play in full; their
  "Sponsored" badge outside the player is covered too, which the maintainer ruled
  acceptable (2026-11-18, after a live check).

## Alternatives
- The service's own fullscreen – rejected: in floawty it takes the whole screen, not
  the overlay, and a script may not start it without a user gesture.
- Hiding page parts one by one (`display: none`) – rejected: more selectors that can
  break, and it would remove ad slots instead of covering them.
- Rules for all six services – rejected: rules without an effect that can still break.
- Per-service switch or off at every start – rejected for one simple switch.

## Consequences
Selectors and layer numbers depend on each site's DOM ([[tech-video-only]]); a missing
player leaves the normal page and a warning dot. Builds on [[page-scripts-polled-on-title-change]].

Extended to Crunchyroll with its tile (maintainer, visual plan "mvp-08", round 2,
2026-11-18).
