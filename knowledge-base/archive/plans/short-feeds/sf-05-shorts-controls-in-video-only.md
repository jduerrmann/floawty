---
type: plan
tags: [package, youtube, shorts, video-only]
status: done
created: 2026-11-21
updated: 2026-11-21
source: visual plan "Shorts-Scrollen und TikTok", rounds 4–5, 2026-11-20/21
---

# sf-05 – YouTube's own controls for Shorts in video only

Plan: [[plan-short-feeds]]

## Outcome
Under video only on YouTube Shorts, YouTube's own controls – play, the speaker whose
volume slider opens on hover, "⋮ More actions" – sit at the bottom of the window above
YouTube's own seek bar, shown while the mouse is over the video, never under floawty's bar.

## Decided (maintainer, round 5, 2026-11-21)
- The volume control is YouTube's own (TikTok's own in sf-03), not one of floawty's;
  the volume stays saved by the service.
- YouTube's control row moves to the bottom, directly above the seek bar; floawty's bar
  (40 px, top) overlaps nothing.
- The seek bar is YouTube's own: thin at the bottom, thicker on hover (the maintainer's
  round-4 wish). YouTube decides whether an ad may be sought; floawty adds nothing.
- Play and "⋮ More actions" come along with the row.

## Scope
- Owns: `src/services/youtube/selectors.ts` (the video-only CSS: exceptions for the
  control row and the seek bar, their position), `test/fixtures/youtube/shorts.html`,
  `tests/adapters/video-only-shorts.spec.ts` and `video-only-helpers.ts` (split from `video-only.spec.ts`), [[tech-video-only]],
  a follow-up line in [[shorts-video-only-fills-with-the-list]], CHANGELOG.
- Non-goals: a volume control or seek bar of floawty's own; the watch page (its player
  keeps YouTube's normal controls); TikTok (sf-03); any IPC or setting.
- Read first: [[tech-video-only]], [[shorts-video-only-fills-with-the-list]],
  `src/services/youtube/selectors.ts`, sf-01's evidence in `archive/plans/short-feeds/`.

## Live facts (floawty release app, fresh profile, 270×480, 2026-11-21)
- The row is `#player-container > div.player-controls`, a sibling of `ytd-player`, so
  `BESIDE_THE_PLAYER` (`#player-container > :not(ytd-player)`) hides it under video only
  (`content-visibility: hidden`). It holds ▶ "Pausieren (k)", 🔊 "Stummschalten (m)" with
  the slider `input#volume-input`, ⋮ "Mehr Aktionen" (48 px buttons); the captions and
  full-screen buttons are there with no box.
- Normal page: the row sits at y = 25–97, 315 px wide (wider than the 270 px window).
  Under video only it sits at y = 0–48 – under floawty's bar – and must move down.
- YouTube itself shows the row on hover (opacity 0 → 1) and hides it when the mouse
  leaves, also under video only; the blind spot "YouTube toggles it" holds, no fallback.
- The seek bar is `.player-wrapper > div#scrubber` (sibling of `#player-container`) with
  `desktop-shorts-player-controls > yt-progress-bar` (3 px line, 24 px hit area); hidden
  by `.player-wrapper > :not(#player-container)`. It sits below the Short's box: y = 601
  on the normal page and y = 560 under video only, both below the 480 px window.
- So under video only both get an exception from `BESIDE_THE_PLAYER` and a fixed place
  at the bottom: the seek bar on the bottom edge, the row directly above it.

## Acceptance criteria
- [x] Video only on `/shorts/…`, mouse over the video: ▶, 🔊 (slider opens on hover)
      and ⋮ at the bottom above the seek bar; nothing within floawty's bar (top 40 px).
- [x] Mouse away: the row hides as YouTube does; the seek bar shows as YouTube shows it.
- [x] Volume and mute work and stay as YouTube keeps them; seeking works; ads follow
      YouTube's own rules.
- [x] Wheel and swipe paging (sf-01), the ad card and the auto mode behave as before.
- [x] Without video only and in window mode nothing changes.
- [x] A changed selector leaves the controls hidden as today: no crash, no frozen picture.
- [x] Maintainer live test.

## Tests first
- Playwright adapter on the routed Shorts fixture, extended by a control row and a seek
  bar beside the player as on YouTube: under video only both are rendered (not
  `content-visibility: hidden`), inside the window, at the bottom and below the top
  40 px; the other parts beside the player stay hidden (red first).

## Checks
- `npm run check`; app run with the maintainer's yes (`verify`; `measure` – page CSS).
- Independent review by `advisor`.

## Evidence (2026-11-21)
- Fixture `shorts.html`: the row and seek bar as live (row 72 px at y = 25 over the video,
  bar 3 px below the Short with its 24 px hit area). New adapter test red first (the bar
  lay below the window); then green. The sf-01 corner test now expects YouTube's row at
  (0.5, 0.95) instead of the player.
- CSS: `CONTROL_ROW` and `SEEK_BAR` of the Short holding `#shorts-player` are exempt from
  `BESIDE_THE_PLAYER` and fixed across the window bottom (bar 8 px up, row 24 px up).
- `npm run check` green (74 unit, 87 adapter, 113 Rust).
- Maintainer live test in the release app (2026-11-21): row and bar at the bottom, hover,
  volume, seeking and the wheel – passed.

## Review (advisor) and resolution
- High, ad Shorts unverified: the row and bar share the bottom with the ad card. The card
  is lifted above them (`z-index: 2`); the fixture's card has no z-index of its own and a
  realistic size; the ad test now checks the card takes hits at its centre and its low
  edge (red first). Not yet seen live on an ad Short.
- Medium, exemption wider than the positioning: only the row and bar of the box holding
  `#shorts-player` are exempt; a test with a Short the player has left (red first; the
  old exemption turns it red, checked by mutation).
- Medium, lost coverage: one hidden sibling per edited level in the fixture, checked by
  its content.
- Medium, containing block: the fixture's boxes contain fixed children; YouTube's not
  checked – Known gap in [[tech-video-only]], live probe proposed (wheel over the row).
- Low: the row's `[x, width]` and its place on the bar pinned; the corner test checks the
  three upper points only; CHANGELOG says what was seen (bar always, row on hover);
  Known gaps for renamed elements; decision [[service-own-controls-in-video-only]].
- `video-only.spec.ts` passed the 400-line limit: the Shorts tests moved to
  `video-only-shorts.spec.ts`, the shared helpers to `video-only-helpers.ts`.
  `npm run check` green (74 unit, 88 adapter, 113 Rust).

## Probe 3 (floawty, fresh profile, 270×480, 2026-11-21)
- YouTube's Short box has `contain: size layout`, like the fixture: the fixed row and bar
  belong to their Short and move with it (finding 4 holds).
- Settled, the bar's line sits at y = 472 (8 px up) and the row ends at y = 456, as set.
  Right after switching video only on, the list stood 80 px off and snapped back later
  (the known jump of the list when video only switches).
- Every Short has `#ads-overlay` (absolute, z-index 1, the Short's full size), later in
  the DOM than the row, so it already lay above the row in the maintainer's test, and the
  row stayed usable: the lift to z-index 2 changes nothing there.
- The wheel over the row: the list moved 80 px (the pending snap), the Short stayed –
  inconclusive; the maintainer's wheel test covered the video, not the row.

## App run (maintainer's yes, 2026-11-21)
- `npm run verify` green (74 unit, 88 adapter, 113 Rust, 34 app tests).
- `npm run measure`: 3.3 MiB, start 47 ms, idle 236.5 MB / 0 %, YouTube 1080p 720 MB /
  0.34 %, hidden 0 % CPU – within budget. Idle RAM rose over the last runs (201.8 →
  219.3 → 236.5 MB) without a change to the tile view; not caused by this CSS.

## Resume here
Done: committed as 4b6f60b (2026-11-21) after verify, measure, the advisor review and the
maintainer's live tests, the wheel over the row included (2026-11-21); archived. Not seen
live: an ad Short with the row hovered (the card lies above the row by YouTube's order).
