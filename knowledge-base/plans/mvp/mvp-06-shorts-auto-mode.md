---
type: plan
tags: [package, mvp, shorts, youtube]
status: planned
created: 2026-11-17
updated: 2026-11-17
source: conversation
---

# mvp-06 – YouTube Shorts auto mode

Plan: [[plan-mvp]]

## Outcome

With auto mode on, the next Short starts after one full run, after a short
configurable pause; hovering pauses the automatic.

## Scope

- Owns: `src/services/youtube/` page script, `selectors.ts`, Shorts state machine,
  fixtures in `test/fixtures/youtube/`.
- Non-goals: anything that likes, subscribes, comments or skips ads.
- Read first: AGENTS.md rules 7 and 9 (Shorts), [[overlay-controls]] (behaviour),
  [[engineering-standards]] §1–2.

## Acceptance criteria

- [ ] Detects "reached the end / started over" of a looping Short, not only `ended`.
- [ ] Moves on the way a user would (the site's own next control or keyboard).
- [ ] Pause (default 1 s) from the settings; hovering the overlay holds the automatic.
- [ ] Ads between Shorts play normally and are never skipped.
- [ ] Overlay switches to 9:16 while Shorts play.
- [ ] A broken selector leaves the normal page and a small hint (fail soft).
- [ ] The page script reports only via a narrow, typed channel; no general IPC for
      youtube.com.

## Tests first

- Vitest: state machine (playing → near end → restarted → advance; ad showing → wait;
  hover → hold), selector fallback.
- Playwright on hand-written fixtures: advance happens once per Short.

## Checks

- `npm run verify`; live check by the maintainer: 10 Shorts in a row, with ads.

## Resume here

Not started.
