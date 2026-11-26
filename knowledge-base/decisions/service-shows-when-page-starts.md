---
type: decision
area: services
tags: [tiles, webview, perceived-speed]
status: active
created: 2026-11-26
updated: 2026-11-26
source: visual plan "Kacheln öffnen schneller", rounds 1–3, maintainer 2026-11-26
---

# A new service shows when its page starts loading

## Context
After a tile click nothing visible happened, then a white area, then the page. Measured
hidden, floawty is as fast as Chrome; the wait is the page's own loading
([[mvp-measurements]]), so the change is about what the user sees meanwhile.

## Decision
- The clicked tile shows that it opens; the other tiles step back; more tile clicks
  start nothing until the page took over.
- The service webview is added at full size just left of the window (out of sight)
  and moved to its place at
  `PageLoadEvent::Started` (WebView2's ContentLoading), at the latest at `Finished`,
  also after a failure. Its background is floawty's ground colour until the first load
  ends, then white again, so pages without a background of their own look as before.
- Back in the bar cancels an opening; the bar stays as on the tiles meanwhile.

## Alternatives
- Show it at once (before) – a white or empty area for most of the wait.
- Show it only when loaded – hides the skeletons YouTube and Netflix draw early.
- A loading picture over the whole area, or a line in the bar – a picture more
  between tile and page; the maintainer chose the tile.
- Reuse one webview and navigate it – saves about 0.05 s, binds guard and page
  scripts anew; dropped after measuring.
- A transparent webview over a loading layer – costs composition while video plays.
- Size 0 until the page starts – breaks page popups (measured, see consequences).

## Consequences
- `OverlayState.opening` names the service while it opens; `service::fit` keeps it
  left of the window until then. Not size 0: a webview created at size 0 never shows
  a page's popups (suggestion list, `bar.spec.ts`), and the page's first scripts would
  see no width.
- A page that never reaches `Finished` keeps the tile marked until back; WebView2 ends
  every navigation with `NavigationCompleted`, also on errors.
- `service::open` and `close` run one at a time (worker threads only), so a close
  never slips into an open that is still adding its webview.
