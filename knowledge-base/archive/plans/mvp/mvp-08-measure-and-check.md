---
type: plan
tags: [package, mvp, performance, services]
status: done
created: 2026-11-17
updated: 2026-11-18
source: conversation
---

# mvp-08 – Measure against budgets, service checks

Plan: [[plan-mvp]]

## Outcome

The MVP is shown to meet the budgets and to work with every service; the result
decides whether the release pipeline (phase 3) starts.

## Scope

- Owns: a Playwright measuring driver (`tests/measure/`, `npm run measure`) that sets up
  the scenarios in the release build over the debug port and runs `spikes/measure`; a
  results note; Apple TV+ and Crunchyroll tiles if they play; small sign-in fixes.
- Non-goals: optimisation beyond the budgets.
- Read first: [[stack-by-spike]] (budgets), [[stack-spike-results]], `spikes/measure/README.md`.

## Acceptance criteria

- [x] Download ≤ 10 MiB, start ≤ 200 ms, RAM idle ≤ 250 MB, RAM YouTube 1080p ≤ 850 MB,
      CPU idle and hidden ≈ 0 % – measured, numbers recorded.
- [x] Idle network: only the disclosed WebView2 connections, nothing else
      ([[webview2-component-updates-disclosed]]).
- [x] Maintainer checks: every tile plays, incl. Twitch, Apple TV+, Crunchyroll
      (tiles added for those that pass, [[drm-services-in-first-release]]).
- [x] Sign-in flows and pop-ups of every service work with the navigation guard
      (moved from mvp-04); Prime Video's passkey prompt moved to [[mvp-09-passkey-prompt]].
- [x] Netflix, Prime Video, Disney+, RTL+: playback shows only the player, so "video
      only" needs no rules there (moved from mvp-07, [[tech-video-only]]).
- [x] Results note under `research/` linked from the index ([[mvp-measurements]]).
- [x] Fixes from the checks built and re-checked by the maintainer: Twitch, Apple TV+
      and RTL+ sign in; Netflix without scrollbar; Crunchyroll video only; tiles; grip;
      flush corners; YouTube volume kept. Not re-checked by the maintainer: the sign-in
      suggestion list (app test only) and YouTube video only in a large overlay (live in Edge).

## Decided (visual plan round 1, 2026-11-18)

- No measuring code in the app: a driver sets up `youtube-1080p` and `hidden` over the
  debug port; start and `idle` are measured without the port (port cost at idle was
  within noise, 200–228 MB).
- Fresh profile, YouTube cookie banner "Reject all". Download = portable exe for now.
- Maintainer reports service checks on a checklist page. Apple TV+ and Crunchyroll get
  tiles with own symbols if they play. A sign-in blocked by the navigation guard gets a
  small fix here; a larger rework becomes its own package; so does a missed budget.
- Results in `research/mvp-measurements.md`.

## Decided (visual plan round 2, 2026-11-18)

- Bar: a pinned strip above the page in window mode; over a service in the floaty view
  only as wide as its controls, with a grip ⠿ to move the window
  ([[bar-leaves-the-page-clickable]]).
- Fixes found in the checks: RTL+ may open Amazon to sign in; a height-only drag keeps
  its height and the window stays on screen; Netflix shows no page scrollbar on
  `/watch/`; the keyboard goes back from the bar only, so page pop-ups stay open.
- Tiles: four per row, three below 360 px. Crunchyroll gets a tile with video only.
- Prime Video's passkey prompt: [[mvp-09-passkey-prompt]]. Apple TV+ tile once it plays.

## Checks

- `npm run measure` against the release build; `npm run verify`.

## Evidence

- Measurements and service results: [[mvp-measurements]]; `npm run measure` re-run after
  round 2 (idle 216 MB, YouTube 1080p 727 MB at 61.8 fps, hidden CPU 0.06 %).
- `npm run verify` green on the final tree (68 Vitest, 94 cargo, 71 Playwright); new tests: geometry (`fit_resized`,
  `shift_inside`, flush snapping), bar (`layout`, watch split), app (bar narrow / above the
  page, grip drag, service follows the window, suggestion list stays open, 4 tile
  columns), adapters (Netflix 4, Crunchyroll 4, YouTube wide-layout trap).
- Maintainer additions during the checks: flush snapping ([[overlay-snaps-flush]]),
  Apple TV+ tile. Free aspect ratio (21:9, height-only) is a follow-up, not mvp-08.
- Independent review (advisor, Fable 5.2, 2026-11-18) of the diff before the last
  round: 1 blocker, 5 should-fix, nits. Resolution: no drag handle → grip ⠿ with app
  test; bar width clamped → measured under a `measuring` class; Shorts hold dead in
  window mode → cursor watched in both modes, bar follows only in floaty (unit test);
  resize mid-drag → no settle while the button is down; growth off screen →
  `shift_inside` (unit test); disclosure wording → corrected after measuring the
  download host (BITS, Microsoft CDN); missing tests → added; package notes → updated.
  Nits: lastService keeps old domains → documented as known gap; Netflix rule kept
  (maintainer saw no scrollbar, controls fine); CPU threshold kept; fit errors still
  ignored (no failing case known); doc errors fixed.
- Follow-up review (same advisor) of the fixes plus later changes: earlier findings
  resolved except the width clamp. Resolution: measuring adds `flex: none`; compact
  layout now set by overflow instead of a fixed width (grip made 7 controls overflow at
  270 px); keyboard asked before hiding and handed back after pointer clicks;
  settling split into `overlay/settle.rs` (overlay.rs was above 400 lines); swapped
  mouse buttons; `shift_inside` only after a resize; dead gap code removed; duplicate
  test helper removed; tests for bar width and three tile columns added; free aspect
  ratio recorded as open question 5. Kept: the hidden-CPU median 0.06 % (below the
  0.1 % check); the tile is named "Apple TV", Apple's name since 2025 (maintainer).

## Resume here

Done 2026-11-18 on branch `feat/mvp-08-measure-and-check`: all criteria met, both reviews
resolved, final `npm run verify` green (68 Vitest, 94 cargo, 71 Playwright, build).
Follow-ups: [[mvp-09-passkey-prompt]], open question 5 (free aspect ratio).
