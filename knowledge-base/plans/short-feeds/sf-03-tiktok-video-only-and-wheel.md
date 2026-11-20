---
type: plan
tags: [package, tiktok, video-only]
status: planned
created: 2026-11-20
updated: 2026-11-20
source: visual plan "Shorts-Scrollen und TikTok", 2026-11-20; advisor plan check
---

# sf-03 – TikTok video only and wheel

Plan: [[plan-short-feeds]]

## Outcome
On TikTok's feed and single video pages, video only shows just the current video, and
the wheel over it moves one video per gesture, as for Shorts (sf-01).

## Scope
- Owns: `src/services/tiktok/page.ts`, `selectors.ts`, `manifest.ts` (`videoOnly`),
  `src/services/video-only.ts` (only if marking needs a hook), `test/fixtures/tiktok/`,
  `tests/adapters/video-only.spec.ts` or `tiktok.spec.ts`, [[tech-video-only]],
  [[video-only-lays-player-over-page]] follow-up in [[tiktok-as-short-feed]], CHANGELOG.
- Non-goals: hiding or closing TikTok's dialogs; any other service.
- Read first: [[tech-video-only]], `video-only.ts`, `src/services/_zoom/page.ts`
  (`data-floawty-zoom` precedent), [[shorts-video-only-fills-with-the-list]] (check first
  whether TikTok's own feed can fill the window the same way).

## Marking the current player
- Mark the current article's player container (`.tiktok-web-player`), never a recycled
  `<video>`; at most one mark; stale marks are removed.
- The mark moves when another video starts playing (media events), not on `loadstart`
  and not on pause: the auto mode's wait, hiding and the settings pause every video.
- No unambiguous player → no mark and no video-only class, so the page scrolls normally.
- Before the first playback: define the fallback (first article's container) so no
  false `player-missing` appears after 2 s.
- The fixed player stays below TikTok's guest dialogs and captchas (live-check their
  layers; pick the z-index from them).

## Acceptance criteria
- [ ] Video only on `/foryou`, `/following` and `/@user/video/<id>` shows only the
      current video; sound and picture always belong to the same item.
- [ ] Paging by TikTok's controls, the auto mode or the wheel moves the mark along.
- [ ] Wheel: one video per gesture both ways, Ctrl+wheel never, no double paging by
      native scroll (live criterion).
- [ ] Guest dialog and captcha appear above the video and stay usable.
- [ ] Ad items: video plays in full; the ad label as answered in [[open-questions]] #9.
- [ ] Missing player after 2 s → warning dot; never a frozen picture with new sound.
- [ ] Maintainer live test.

## Tests first
- Playwright adapter on routed TikTok fixtures with two recycled videos: mark follows
  the playing item; pause keeps it; ambiguous → class off; the wheel pages once
  per gesture.

## Checks
- `npm run verify`; release app live check; resource measurement.
- Independent review by `advisor`.

## Resume here
Not started; waits for sf-02.
