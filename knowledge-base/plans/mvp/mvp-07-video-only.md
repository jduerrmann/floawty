---
type: plan
tags: [package, mvp, services, video-only]
status: planned
created: 2026-11-17
updated: 2026-11-17
source: conversation
---

# mvp-07 – "Video only" view

Plan: [[plan-mvp]]

## Outcome

"Video only" hides the page around the player so the video fills the overlay –
first YouTube and Netflix, then Prime Video, Disney+, Twitch and RTL+.

## Scope

- Owns: `src/services/<id>/` page script parts and `selectors.ts` for the view,
  fixtures in `test/fixtures/<id>/`, the on/off control in the bar.
- Non-goals: changing or hiding ads, player controls of the service.
- Read first: AGENTS.md rule 7 (adapters fail soft, selectors are data),
  [[mvp-scope-and-controls]] (risk).

## Acceptance criteria

- [ ] YouTube and Netflix: player fills the overlay, page chrome hidden, the
      service's own player controls still work.
- [ ] Prime Video, Disney+, Twitch, RTL+ follow, one `fix`-sized change each.
- [ ] A missing selector shows the normal page plus a small hint; never a blank view.
- [ ] Toggling "video only" needs no reload.
- [ ] Only styles are added; no page content is removed or changed beyond hiding.

## Tests first

- Playwright on hand-written fixtures per service: player visible and full size,
  chrome hidden; missing selector → normal page and hint.

## Checks

- `npm run verify`; live check by the maintainer per service.

## Resume here

Not started.
