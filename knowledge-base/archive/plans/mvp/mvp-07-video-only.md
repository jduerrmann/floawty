---
type: plan
tags: [package, mvp, services, video-only]
status: done
created: 2026-11-17
updated: 2026-11-18
source: conversation; visual plan "mvp-07 Nur Video", approved 2026-11-18
---

# mvp-07 – "Video only" view

Plan: [[plan-mvp]] · Decision: [[video-only-lays-player-over-page]] · Tech: [[tech-video-only]]

## Outcome

"Video only" lays the player over the page so the video fills the overlay – YouTube
(watch and Shorts) and Twitch; Netflix, Prime Video, Disney+ and RTL+ already show only
their player while playing and get no rules.

## Scope

- Owns: `src/services/video-only.ts`, `bridge.ts`, the adapters' `page.ts` and
  `selectors.ts`, fixtures in `test/fixtures/<id>/`, the ▣ button, the `videoOnly`
  setting and hotkey, `page.rs` status `problems`.
- Non-goals: changing or hiding ads in the player, the services' player controls,
  rules for Netflix, Prime Video, Disney+, RTL+, a settings-panel checkbox.

## Acceptance criteria

- [x] YouTube watch page: the player fills the overlay, header, suggestions and
      comments are beneath it, YouTube's controls work (live 2026-11-18).
- [x] Twitch channel: the player fills the overlay over navigation, details and chat
      (live 2026-11-18; Twitch's own age gate shows inside the player).
- [x] Shorts: like bar and next control covered, the auto mode still moves on; click to
      pause, `m` and ↓ work as without video only (live; the mouse wheel moved on in
      neither run).
- [x] Ad Shorts play in full; YouTube's "Sponsored" badge lies under the player, which
      the maintainer ruled acceptable (2026-11-18).
- [x] ▣ or Ctrl+Alt+Shift+V toggles without a reload; the setting is saved.
- [x] Window mode shows the whole page, back in the floaty view video only again.
- [x] A missing player leaves the normal page plus the dot on ▣ and one log line.
- [x] Only styles are added; no element is removed or added in the page body.
- [x] Consent dialogs of YouTube and Twitch stay above the player (live).
- Moved to mvp-08: Netflix, Prime Video, Disney+, RTL+ show only the player (needs the
  maintainer's accounts).

## Evidence

- `npm run verify` passed 2026-11-18 after the review fixes (58 Playwright tests incl.
  21 new adapter and 3 new app tests).
- Live run in the release app without account: YouTube watch 480×270 video fills,
  Shorts 270×480 fill and advance, Twitch channel fills, home and directory pages untouched.
- Resources, same 480p YouTube video, 40 s each: video only off 665 MB / 0.30 % CPU,
  on 647 MB / 0.24 % CPU (median, `spikes/measure`).
- Bar at the narrowest overlay (224 px inside): ✕ cut off with ▣ added → narrow-width
  CSS (24 px buttons, no gap), now ends at 218 px.
- Delegated: `coder` (Sonnet 5.5) built the Rust and bar slice (settings, hotkey,
  command, page.rs contract, bar, i18n); the lead reviewed its diff and ran all checks.
- Independent review: `advisor` (Fable 5.2), no blockers. Resolved: player pages now also
  check the host (www only); style created lazily; garbage-while-on, resize count, hidden
  player on /watch, other hosts and the real ▣ click are tested; problems sorted and
  deduplicated in `parse` (no separate cap), one lock for logging; tech-window and
  tech-services updated; Shorts operation checked live. Kept: ▣ stays enabled in window
  mode and the hotkey works on any page (the switch is global and saved). Finding 1 (ad
  Shorts badge covered) decided by the maintainer: covering is fine.

## Resume here

Done 2026-11-18 on branch `feat/mvp-07-video-only`; commit after the maintainer's OK.
