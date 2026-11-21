---
type: decision
area: services
tags: [video-only, shorts, tiktok, volume, seek]
status: active
created: 2026-11-21
updated: 2026-11-21
source: visual plan "Shorts-Scrollen und TikTok", rounds 4–5, maintainer, 2026-11-20/21
---

# Under video only, short feeds keep the service's own volume control and seek bar

## Context
Video only on YouTube Shorts hid everything beside the player, YouTube's control row and
seek bar too, so neither the volume nor the position could be changed. The maintainer
wanted a speaker whose slider opens on hover and a seek bar, without permanent buttons.

## Decision
- The service's own controls stay: on YouTube Shorts the row (play, speaker with its hover
  slider, ⋮) and the seek bar of the playing Short; on TikTok its own (sf-03).
- They sit at the bottom of the window, the row right above the seek bar, never under
  floawty's bar at the top; the service shows and hides them on hover itself.
- Seeking follows the service's rules, also on ads; floawty adds nothing. An ad card that
  shares the bottom stays on top of the controls ([[core-principles]] #7).

## Alternatives
- floawty's own volume control in its bar – the same for every service, but floawty would
  have to set and match the service's volume itself, and the bar grows wider.
- The row at the top as on YouTube – floawty's bar covers play and volume on hover.
- No seek bar, volume only – the maintainer wanted to jump to a position.

## Consequences
- Extends [[shorts-video-only-fills-with-the-list]] by exempting the row and seek bar.
- A renamed control element is hidden again without a warning dot ([[tech-video-only]]).
- Implemented by [[sf-05-shorts-controls-in-video-only]]; TikTok in
  [[sf-03-tiktok-video-only-and-wheel]].
