---
type: plan
tags: [package, tiktok, video-only]
status: in-progress
created: 2026-11-20
updated: 2026-11-21
source: visual plan "Shorts-Scrollen und TikTok", 2026-11-20; advisor plan check; maintainer, 2026-11-21
---

# sf-03 – TikTok video only and wheel

Plan: [[plan-short-feeds]]

## Outcome
On TikTok's feed and single video pages, video only shows just the current video, and
the wheel over it pages as on TikTok's own page, as for Shorts (sf-01).

## Scope
- Owns: `src/services/tiktok/page.ts`, `selectors.ts`, `manifest.ts` (`videoOnly`),
  `src/services/manifest.test.ts`, `test/fixtures/tiktok/foryou.html`,
  `tests/adapters/video-only-tiktok.spec.ts`, `video-only-helpers.ts` (TikTok site),
  [[tech-video-only]], [[tech-shorts]], [[tiktok-as-short-feed]],
  [[tiktok-video-only-fills-with-the-feed]], [[tech-services]], CHANGELOG. Hook lines in
  [[decisions]] and [[INDEX]] wait for the release session, as for the other sf decisions.
- Non-goals: hiding or closing TikTok's dialogs; any other service.

## Decided (maintainer, 2026-11-21)
- The feed list fills the window as on Shorts instead of marking the playing player
  ([[tiktok-video-only-fills-with-the-feed]]); open question #9: the ad label stays visible.
- On the video only TikTok's volume control, progress bar and labels stay.
- Video pages `/@user/video/<id>` become feed pages (portrait, auto mode), closing the gap
  noted in [[tech-shorts]].

## Live facts (built-in browser, 386×586, 2026-11-21)
- `/foryou` and video pages: one `#column-list-container` (scroll-snap y mandatory; overflow
  hidden on the feed, scroll on video pages) of `article[data-e2e=recommend-list-item-container]`,
  each with a flex div holding `section[data-e2e=feed-video]` (media card: video, overlay,
  progress bar) and the action bar `section`.
- Narrow window: items 651 px in a 586 px window; the wheel on TikTok's own page stopped at
  65 px. Filled: items 586 px; a large wheel turn pages down and up, TikTok plays the item in
  view. One notch of the pane's synthetic wheel (100 px) snaps back, on TikTok's own wide
  page too – the real wheel is the maintainer's live criterion.
- Layers: header 100, sign-up and interest dialogs 2100, base dialog 9999, toasts 5500.
- Media card: `min-height` and `aspect-ratio: 9/16` set by TikTok; the volume control's
  slider opens to the right on hover; CapCut/AI/place chips sit right above the progress bar.
- No ad in about 70 guest items; the ad label's place is unknown.
- Video page: next control present, items have distinct ids, and paging changes path and
  title to each item's own `/@user/video/<id>`; photo items presumably `/@user/photo/<id>`.
- Under video only: ten next clicks paged exactly (each item at y = 0, the item in view
  plays; TikTok swallowed one click); switching video only off and on at the tenth item
  kept it in view and playing.

## Probe (floawty release app, fresh profile, 270×480, 2026-11-21, in the verify run)
- Off: list 420 px wide at x = 72, card 348×619 at y = 16. On: list 270×480, card 480 px high
  but still 348 px wide at x = -39 – TikTok sets a minimum size, so volume and the progress
  bar's start lay outside the window → `min-width: 0` added, fixture card wider than the
  window, red first, green.
- No scrollbar on the video page (list client width = window width).
- TikTok's sign-in dialog (layer 3001) opened on the feed and the video page and lay above
  the list; a 100 px CDP wheel notch at the centre hit the dialog, so the item stayed – the
  wheel stays the maintainer's check, signed in.
- Second run after the fix (maintainer's yes): card 270×480 at 0,0, volume at 8,384, progress
  bar 0,464 across 270 px, on the feed and a video page; the sign-in dialog above.

## Acceptance criteria
- [x] Video only on `/foryou` and `/@user/video/<id>` shows only the current video
      (`/following` not observed); TikTok plays the item in view, so sound and picture match (adapter
      tests; built-in browser on `/foryou` and a video page).
- [x] TikTok's own volume control and progress bar sit in the window, at the bottom, never
      under floawty's bar (adapter test; floawty probe). Using them: maintainer's test.
- [ ] Wheel: one video per gesture both ways as on TikTok, no double paging (live).
- [x] Guest dialogs appear above the video (adapter test; built-in browser). A captcha's
      layer is not yet seen.
- [ ] Ad items: video plays in full; TikTok's ad label stays visible (deny list; not seen
      live).
- [x] Missing list or card after 2 s → warning dot, page untouched (adapter test).
- [ ] Maintainer live test.

## Tests first
- `tests/adapters/video-only-tiktok.spec.ts`: list and card fill the window, next item one
  window below; deny-listed parts hidden, volume, progress and label visible; volume and
  progress at the bottom; wheel reaches the list; dialog above; video page; off leaves the
  page; renamed list → `player-missing`; auto mode through the covered next control.
  Red before the rules (5 of 9), green after; `tiktok.spec.ts` unchanged and green.
  After the review: nested section and unknown card stay visible, photo pages, profile page
  is no feed page, wheel asserts item 1 at y = 0, manifest lists TikTok with `videoOnly`;
  each red first.

## Checks
- `npm run check`; release app live check after the maintainer's yes; resource measurement.
- Independent review by `advisor`.

## Review (advisor, 2026-11-21) and resolution
- High: TikTok's manifest lacked `videoOnly`, so no ▣ button or warning dot → fixed, test red first.
- Medium: `section:not(feed-video)` hid any section, an unknown card too → now only the card's
  siblings (`${MEDIA_CARD} ~ section`), tests red first.
- Medium: ad label unverified; on an ad the name line and description may carry label,
  advertiser and text → notes state it; the maintainer ships it as built and checks an ad
  in the next signed-in live test; a label in a hidden part changes the rule.
- Medium: video-page facts → checked live (above); photo pages added; a shared
  `isFeedPage` replaces the doubled path test.
- Medium: wheel unproven → notes no longer claim one notch; live criterion in floawty.
- Medium: depth and toggle → checked live (above); captcha layer stays a live check.
- Low: `right: auto`, card taller than the window in the fixture, negative path test,
  sturdier wheel assertion, comments, stale plan-map line, package status → done.

## Resume here
Review resolved; verify green and the width fix seen in floawty (2026-11-21). Next: commit
after the maintainer's OK; the maintainer's own test signed in (one wheel notch both ways,
volume and seek by hand, an ad if one comes) closes the package.
