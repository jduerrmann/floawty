---
type: plan
tags: [package, tiktok, shorts]
status: planned
created: 2026-11-20
updated: 2026-11-20
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

## Seams the feed module must cover (decide before extracting)
- The current video is found by a function, not a selector (TikTok keeps two
  recycled `<video>` elements; the playing one or the one in the current article).
- Media start: YouTube uses `loadstart`; TikTok preloads its next video, so a
  `loadstart` of the preloaded one must not count. Per-adapter trigger.
- End: TikTok fires `ended`, then seeks to 0 and plays; the pause on the first frame
  must survive that (as YouTube's loop seek today).
- Per-item wake: check in floawty whether TikTok changes title or path per item; if
  not, the page drives its own status changes from media events.
- Live check in floawty first: selectors, `ended`, scripted next click, any captcha.

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

## Acceptance criteria
- [ ] Tile with "T in an upright frame" after YouTube Shorts; opens `/foryou` portrait,
      auto mode on.
- [ ] After a video's full run (incl. ads) the next one starts; pause and hold on
      hover behave as for Shorts; LIVE items and photo series stay.
- [ ] Bar button and settings read "Auto mode" / "Automodus" and "Shorts and TikTok"
      in EN and DE; YouTube Shorts behave exactly as before (existing tests green).
- [ ] Missing next control → `controls-missing` warning, video loops as usual.
- [ ] Guest dialogs and captchas stay untouched.
- [ ] Maintainer live test of the TikTok tile (the admission test for a new service).

## Tests first
- Vitest: manifest valid; state machine tests move with `shorts.ts` unchanged.
- Playwright adapter on routed `www.tiktok.com` fixtures: end → pause → next click;
  preloaded video's `loadstart` ignored; seek-and-play after `ended` keeps the pause;
  missing control → problem.
- Existing `youtube-shorts.spec.ts` and `tests/shorts.spec.ts` stay green.

## Checks
- `npm run verify`; release app live check; resource measurement (page script change).
- Independent review by `advisor`.

## Resume here
Not started; waits for sf-01. Next action: live check of TikTok in floawty, then the
seam list as a short design note in this package.
