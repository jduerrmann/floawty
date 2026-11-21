---
type: plan
tags: [package, tiktok, shorts]
status: in-progress
created: 2026-11-20
updated: 2026-11-21
source: visual plan "Shorts-Scrollen und TikTok", 2026-11-20; advisor plan check
---

# sf-02 – TikTok tile and auto mode

Plan: [[plan-short-feeds]]

## Outcome
A TikTok tile with floawty's own symbol opens TikTok's For You feed in a portrait
overlay with the auto mode on; after one full run each video moves on through TikTok's
own next control. The auto mode runs from one feed module that YouTube Shorts also uses.

## Scope
- Owns: `src/services/tiktok/` (manifest, page, selectors), `src/assets/symbols/tiktok.svg`,
  `src/services/index.ts`, a shared feed module (e.g. `src/services/short-feed/`) with
  `shorts.ts` moved out of `youtube/`, `src/services/youtube/page.ts` (uses the module),
  `src/i18n.ts` ("Auto mode", "Shorts and TikTok"), `test/fixtures/tiktok/`,
  `tests/adapters/tiktok.spec.ts`, [[tech-shorts]], [[tech-services]], AGENTS.md rule 9
  (after rel-05's edit), [[tiktok-as-short-feed]], CHANGELOG.
- Non-goals: video only and the wheel on TikTok (sf-03); sign-in pop-ups (sf-04);
  a separate TikTok setting; any change to the settings format.
- Read first: [[tech-shorts]], `src/services/youtube/page.ts`, `shorts.ts`,
  `src/services/youtube-shorts/`, [[own-service-symbols]], [[tiktok-as-short-feed]].

## Seams of the feed module (built 2026-11-20)
- `FeedPage` in `src/services/short-feed/feed.ts`: `hosts`, `onFeed()`, `feedFound()`
  (no feed = broken selector), `currentMedia()`, `nextControl()`, `itemKey()` (a change is
  a new item), `startEvents` (YouTube `loadstart`, TikTok none), optional `slide()`,
  `videoOnly`.
- TikTok: the current item is the article across the middle of the window, its medium
  its `video`, else its music `audio` (photo series; a LIVE item is assumed to have none);
  `slide()` reads the Swiper slideshow; the next arrow counts when it is in the DOM, also
  hidden.
- A pause is repeated when the video plays again within 500 ms (TikTok's restart after
  `ended`); the click to move on goes out one task after the event.
- Feed pages for TikTok: `/`, `/foryou`, `/following`; single video pages go to sf-03.

## Live facts in floawty (release app, guest, 2026-11-20)
- `hasBeenActive` is true at start; the user agent is Edge 157.
- End of a video: `pause` → `ended` → seek to 0.1 → `play` → `seeked`; `loop` is false.
  Title and path stay the same per item (`/foryou`); only the playing `<video>` and its
  `article#one-column-item-N` change. Two `<video>` elements are recycled.
- Sign-in wall for guests: on a fresh profile the dialog `[data-e2e="login-modal"]`
  (z-index 3001) opens within seconds; "Überspringen" leads to sign-up, Escape does
  nothing; while it is open, `feed-navigation-next` does not page. On a second start the
  feed paged three items by script, then the dialog came back and blocked again. So
  the auto mode for guests stops every few videos until the user deals with the dialog;
  signed in it should run (to verify with the maintainer's account). The existing
  `blocked` phase covers it: no new media within 3 s, the user's next click unblocks.

## Evidence (2026-11-20)
- Adapter tests first (red: script missing): six TikTok tests on a fixture with two reused
  videos and TikTok's restart; all 70 earlier adapter tests stayed green after the
  extraction. Removing the restart guard turns the first TikTok test red.
- Built-in browser, real TikTok, guest, page script injected: three rounds – each video
  paused for the whole 1 s pause despite TikTok's restart, then moved on exactly one item.
- After the first review: nine TikTok tests plus one for hidden arrows, three for the
  play/pause script (`tests/adapters/play-pause.spec.ts`); each new one red first.
- `npm run check` green (68 unit, 83 adapter, 107 Rust).

## Acceptance criteria
- [ ] Tile with "T in an upright frame" after YouTube Shorts; opens `/foryou` portrait,
      auto mode on.
- [ ] After a video's full run (incl. ads) the next one starts; pause and hold on
      hover behave as for Shorts; a photo series moves on after one round of its pictures
      or its music, whichever is first; LIVE items stay.
- [ ] Bar button and settings read "Auto mode" / "Automodus" and "Shorts and TikTok"
      in EN and DE; YouTube Shorts behave exactly as before (existing tests green).
- [ ] Missing next control → `controls-missing` warning, video loops as usual.
- [ ] Guest dialogs and captchas stay untouched.
- [x] Maintainer live test of the TikTok tile (the admission test for a new service):
      passed 2026-11-20.

## Tests first
- Vitest: manifest valid; state machine tests move with `shorts.ts` unchanged.
- Playwright adapter on routed `www.tiktok.com` fixtures: end → pause → next click;
  preloaded video's `loadstart` ignored; seek-and-play after `ended` keeps the pause;
  missing control → problem.
- Existing `youtube-shorts.spec.ts` and `tests/shorts.spec.ts` stay green.

## Checks
- `npm run verify`; release app live check; resource measurement (page script change).
- Independent review by `advisor`.

## Review (advisor) and resolution
- Medium-high, items without a playing video: the current item is now the article across
  the middle of the window, its video the current one (none for a photo series or LIVE
  item, so nothing is played). Test: no play on the photo item even after the blocked
  timeout (red first).
- Medium, tests: the fixture now pauses before `ended`, scrolls items into view, has
  placeholder articles and a photo item; recorded play/pause change the playing state.
  New tests: pause 0, loadstart of the current video, a scroll during the pause, an idle
  feed without a false warning (each red first).
- Medium, false `controls-missing`: the check uses `feedFound` (an article in the
  middle), not a playing video.
- Medium, pause 0: the click to move on goes out one task later, after TikTok's own
  `ended` handlers. Live check open (the built-in browser was hidden, see below).
- Medium, play/pause hotkey: `PLAY_PAUSE` pauses every playing video, or plays the one
  across the middle; checked on real TikTok (first press played item 4, second paused it).
- Low: notes (CHANGELOG wording, wake consequence, 0.1, labels in tech-bar-and-settings,
  Known gaps), the class gets its one-line reason.
- Found on the way: TikTok hides its arrows in some layouts (761×586 landscape); then the
  auto mode waits without a warning → Known gap. Live checks in the built-in browser are
  only valid while it is shown: hidden, smooth scrolling and TikTok's reaction stall.

## Delta review (advisor) and resolution
- No blocker. Hidden arrows now count as missing (TikTok's `nextControl()` returns only a
  visible arrow): no silent stop, the warning shows; test red first. YouTube keeps its
  plain lookup – a shared visibility gate was not live-checked for YouTube.
- Play/pause: the fallback is the page's only video, never a neighbour on a TikTok photo
  item; the script lives in `src-tauri/src/play_pause.js` (`include_str!`) and has three
  adapter tests.
- Timing: the YouTube "failed advance" test polls; the idle-feed test uses the fake clock.
- Notes: AGENTS.md intro, package seams and evidence, CHANGELOG wording, tech notes.

## App run (maintainer's yes, 2026-11-21)
- `npm run verify`: check green (68 unit, 83 adapter, 107 Rust), build green, app tests
  29/30 – `bar.spec.ts` "a page's suggestion list stays open when the bar hides" failed
  (the datalist did not open after a real click and key press on example.com; no page
  script of this package runs there). The same test failed once in another session and
  then passed 3/3. Re-run with the maintainer's yes: passed.
- `npm run measure`: download 3.3 MiB, start 46 ms, idle 201.8 MB / 0 %, YouTube 1080p
  732.7 MB / 0.39 %, hidden 0.05 % CPU – within budget.

## Maintainer test after the app run (2026-11-21) and fix
- The maintainer saw the warning dot on TikTok. Cause: the visibility gate of the delta
  review. TikTok hides its arrows in the upright overlay too, and a click on the hidden
  arrow pages (live, browser shown, 360×640: items 0 → 1 → 2) – the earlier "hidden
  arrow does nothing" came from the hidden built-in browser. Reverted: TikTok's
  `nextControl()` is the arrow in the DOM again; the test now pins that a hidden arrow
  still moves on without a warning (red first).

## Photo series (maintainer's test, 2026-11-21)
- The maintainer: photo slideshows never moved on. Live: a photo series plays its music in
  an `<audio>` (60 s) that pauses, ends, seeks to 0 and plays like a TikTok video. The feed
  now takes the item's medium (`currentMedia()`: TikTok `video, audio`; YouTube its Short
  video), so a photo series moves on once its music has run; a LIVE item still stays. Tests
  red first: photo series moves on; an item without media never starts another one.
  Decision amended in [[tiktok-as-short-feed]]. The maintainer: works, but takes long.
- Slideshow wrap: live, TikTok's pictures are a Swiper in loop mode (15 slides = 5 × 3,
  `data-swiper-slide-index` 0–4, `.swiper-slide-active`, ~4 s each). New `slide` event of
  the state machine (last picture → 0 completes the run; four Vitest cases red first),
  sampled at the music's `timeupdate`; adapter test on a Swiper fixture red first.

## Delta review 3 (advisor: photo series and revert) and resolution
- Medium, the "no media" test could not fail: it now ends a photo series first, so the
  click lands on the media-less item and the blocked timeout must play nothing; a
  fallback to any page medium turns it red (checked by mutation).
- Medium, hide, settings and the hotkey ignored slideshow music: `PAUSE` and
  `play_pause.js` pause `video, audio` (play-pause test red first); the hotkey still plays
  only videos – Known gap in [[tech-shorts]].
- Low, `video, audio` depended on document order: `currentMedia()` takes the video, else the
  music. Low, notes: seams, "LIVE assumed", `updated:` dates.

## Maintainer retest of the wrap (2026-11-21) and delta review 4 (advisor)
- The maintainer: the photo series looped endlessly. Built-in browser (real TikTok, built
  script injected, 360×640): the photo article held only its music (13 s, ending with the
  slideshow's turn) and moved on 6 → 7 → 8. Live probe in floawty (fresh profile): TikTok's
  sign-in dialog blocked the feed, no photo series reached. Cause not observed.
- Review 4, medium: a parked `video` in a photo article would hide the music entirely (no
  round, no music end) – the likeliest cause. Now a photo series' medium is its music;
  fixture with a hidden parked video, three tests red first. Medium: the wrap rule counted
  from picture 0 only – now a round is every picture seen, then the next change, from any
  first picture; a held round starts anew (Vitest red first). Medium-low: slides only for a
  photo series; a test pins that a video never ends at a slideshow's turn. Low: selector
  names in `selectors.ts`; gap "music does not play" named.
- `npm run check` green (74 unit, 86 adapter, 107 Rust). Maintainer retest in the release
  app (2026-11-21): photo series move on after a round – passed.
- App run on the final code (maintainer's yes): `npm run verify` green (74 unit, 86
  adapter, 107 Rust, 30 app tests); `npm run measure`: 3.3 MiB, start 47 ms, idle
  219.3 MB / 0 %, YouTube 1080p 703.3 MB / 0.39 %, hidden 0.05 % CPU – within budget.
- Open: a photo-series ad's "full run" is not decided separately – treated like any
  photo series.

## Resume here
Code, tests, notes and the app run done on `main`, uncommitted. Next: the commit after
the maintainer's OK, then "sf-02 committed" to the on-top session.
