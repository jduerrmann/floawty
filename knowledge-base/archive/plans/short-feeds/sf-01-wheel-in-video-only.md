---
type: plan
tags: [package, shorts, video-only]
status: done
created: 2026-11-20
updated: 2026-11-20
source: visual plan "Shorts-Scrollen und TikTok", 2026-11-20; maintainer's live tests and choices
---

# sf-01 – Wheel over a Short in video only pages

Plan: [[plan-short-feeds]] · Decision: [[shorts-video-only-fills-with-the-list]]

## Outcome
Under video only, turning the mouse wheel or swiping over a Short goes to the next or
previous Short with YouTube's own animation, and only the video is visible.

## Scope
- Owns: `src/services/youtube/selectors.ts` (video-only rules for Shorts),
  `test/fixtures/youtube/shorts.html` (list, boxes and YouTube's nesting with overlays),
  `tests/adapters/video-only.spec.ts`, a comment in `src/services/youtube/shorts.ts`,
  [[tech-video-only]], [[tech-shorts]], [[shorts-video-only-fills-with-the-list]], CHANGELOG.
- Non-goals: TikTok (sf-03); a seek bar (round 4 of the visual plan); floawty's own
  wheel code.

## Behavior
- On `/shorts/…` the list `ytd-shorts #shorts-container` is fixed at z-index 2200 and
  fills the window; its boxes (`[class*=reel-video-in-sequence]`) and the containers down
  to `#shorts-player` are window-sized. YouTube scrolls, snaps, swipes and shows its
  thumbnail itself.
- On each level only the way to the player stays; everything beside it gets
  `content-visibility: hidden` and `pointer-events: none` – never what holds the player,
  never `#ads-overlay` (an ad Short's card stays visible, maintainer).
- No Short box → video only stays off, `player-missing` after the page has settled. Without video only the page is
  untouched.

## Acceptance criteria
- [x] Adapter: list and player fill the window, overlays (also self-visible ones) never
      lie on top, scroll locked; a wheel over the video scrolls the list one box; a
      dialog stays above; without video only nothing changes; no list → warning.
- [x] Built-in browser, real YouTube: 16 Shorts incl. ads, a 3×3 grid of points per Short
      hit only the player (or, during a change, the empty player box).
- [x] Maintainer, built-in browser: the wheel swipes cleanly (2026-11-20).
- [x] Maintainer live test in floawty (release build): clean swipe, no buttons (2026-11-20).
- [x] `npm run verify` and `npm run measure` after the maintainer's yes (2026-11-20).
- [x] Built-in browser, final CSS: on 12 normal Shorts `#ads-overlay` is empty and never
      hit; on ad Shorts the card shows and takes clicks.

## History (2026-11-20)
1. Fixed player + page script clicking YouTube's up/down controls: the up control ignores
   scripted clicks in the overlay (live, without gesture-carrying calls).
2. Fixed player + page script scrolling the list per gesture (built, reviewed by advisor
   three times, verify green, live green): the maintainer saw the page flash for
   ~125 ms per change – YouTube keeps `ytd-player` `visibility: hidden` after moving it.
   A black layer beneath fixed the flash but not the hard cut.
3. The maintainer asked for YouTube's own swipe → the list fills the window (this
   version). First try used `visibility: hidden` for overlays; the maintainer saw buttons
   reappear – YouTube's overlay parts set their own visibility → `content-visibility`.
   The wheel code, `wheel.ts`, the `user-paged` event and the test split were removed.

## Evidence
- `npm run verify` green 2026-11-20 (68 unit, 70 adapter, 107 Rust, 30 app); red-first for
  the list, wheel, missing-list, self-visible-overlay, renamed-level, renamed-box and
  ad-card tests. `npm run measure`: download 3.3 MiB, start 47 ms, idle 203.4 MB / 0 %,
  YouTube 1080p 687 MB / 0.39 %, hidden 0 % CPU – within budget.

## Review (advisor, list version) and resolution
- High: hiding everything beside the named child could hide the player after a rename →
  `:not(#shorts-player, :has(#shorts-player))`; test: a renamed `#player-container`
  keeps the video visible (red first).
- High, maintainer: the ad card on ad Shorts was not drawn → the maintainer chose to keep
  it visible; `#ads-overlay` is exempt; test checks the card's text (red first); live:
  advertiser, text and "Entdecken" show on an ad Short.
- Medium: the overlay test did not discriminate (pointer-events inherit) → a self-visible
  part with `pointer-events: auto` must fail `checkVisibility()`; red with `visibility`
  instead of `content-visibility`.
- Medium, live (built-in browser): ten scripted next clicks each landed exactly on the
  player's box, clean; 800×600 and 1280×720 filled and clean; click pauses, `m` toggles
  mute, ↓ pages. Toggling video only lands on the neighbouring Short; YouTube alone does
  the same on resize → Known gap in [[tech-video-only]].
- Low: the Short boxes are the presence check (renamed boxes → page untouched + dot);
  `contain: none` removed; Shorts fixture dialog at 2202; wheel test renamed; sf-03 note.

## Review round 3 (advisor, delta) and resolution
- No material code or test finding. Live check of normal Shorts with the ad exemption
  done (above). TikTok's ad label → [[open-questions]] #9. Notes aligned (presence
  check, ad wording, Known gaps for the toggle jump and a renamed `#ads-overlay`); the
  selector comment shortened to one sentence.

## Resume here
Done on `main`, uncommitted (shared folder). Next: the maintainer's OK for the commit;
then `done` and archive. The `decisions.md` hook line for
[[shorts-video-only-fills-with-the-list]] (and the other two short-feeds decisions) is
the maintainer's – my edit was blocked.
