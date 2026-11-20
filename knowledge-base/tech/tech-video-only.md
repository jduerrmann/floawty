---
type: tech
area: services
tags: [video-only, page-script, youtube, twitch]
status: active
created: 2026-11-18
updated: 2026-11-20
source: mvp-07 implementation
---

# "Video only"

The page script lays the service's player over its own page – on YouTube Shorts the whole
list of Shorts. Decisions: [[video-only-lays-player-over-page]],
[[shorts-video-only-fills-with-the-list]]; bridge and wake-ups: [[tech-shorts]].

## Invariants

- One setting `videoOnly` (default off) for all services, toggled by ▣ in the bar
  (`toggle_video_only`) or the `videoOnly` hotkey (Ctrl+Alt+Shift+V). The page input
  carries `videoOnly = setting && mode == floaty`; `toggle_mode` syncs the page.
- Only styles: one `<style>` element (added on first use) and the class
  `floawty-video-only` on `<html>`. The class is set only when the setting wants it,
  the path is a player page of the adapter and its player exists; otherwise the page
  is untouched, including scrolling. Toggling dispatches a `resize` event, since
  YouTube Shorts size their video only then.
- YouTube and Twitch: the player sits at z-index 2200: above YouTube's masthead (2020) and guide (2030)
  and Twitch's navigation (1000), below YouTube's dialogs (2201+). Consent dialogs of
  both services stay above (live-checked 2026-11-18).
- `player-missing` is reported when video only is wanted on a player page whose player
  is still missing 2 s after the last path change; the ▣ button gets the warning dot,
  the log one fixed line per opened service.
- Garbage input keeps the previous setting; the answer is always a valid status.
- Ads play in full. On watch pages ad slots beside the player are covered
  ([[video-only-lays-player-over-page]]); on Shorts `#ads-overlay` stays drawn – YouTube's ad card with advertiser, text, call to action and, in its ad
  layout, like/comment/share ([[shorts-video-only-fills-with-the-list]]).
- Under video only, Shorts keep click to pause, `m` to mute and ↓ to move on (live 2026-11-20),
  and the wheel or a swipe pages with YouTube's own animation and thumbnail (live 2026-11-20).

## Rules per adapter (`selectors.ts`)

| Adapter | Player pages | Player | Extra overrides |
|---|---|---|---|
| YouTube | `www.youtube.com/watch` | `ytd-watch-flexy:not([hidden]) #movie_player` | the hidden watch page stays in the DOM elsewhere; the wider layout names `#player-container` for view transitions (a stacking context), so every ancestor of the player gets `view-transition-name: none` |
| YouTube | `www.youtube.com/shorts/…` | the Short boxes `[class*=reel-video-in-sequence]` of the list `ytd-shorts #shorts-container` | the list is fixed at 2200; its Short boxes and the nested renderer, player containers, `ytd-player` and `#shorts-player` are window-sized; on each level everything beside the way to the player gets `content-visibility: hidden` and `pointer-events: none` – YouTube's overlay parts set their own visibility, so `visibility: hidden` did not hold (live 2026-11-20) |
| Twitch | `www.twitch.tv`: one path part not in a list of Twitch's own pages, `/videos/<id>` | `.persistent-player .video-player` | box: no transform, overflow or max-height; `main` lifted over the nav |
| Crunchyroll | `www.crunchyroll.com/[lang/]watch/…` | `.video-player-wrapper` (Bitmovin player in the page, no iframe) | layer 200: above header (100) and layout overlay (99); `#player-container` fills, no padding |

## Structure

| File | Role | Tests |
|---|---|---|
| `src/services/video-only.ts` | class, style, settle time, missing check | Playwright adapter |
| `src/services/bridge.ts` | frozen `__floawty.sync` in the top frame on the adapter's hosts | Playwright adapter |
| `src/services/youtube/page.ts` | wires the rules into its `sync` | `tests/adapters/video-only.spec.ts` |
| `src/services/twitch/page.ts`, `crunchyroll/page.ts` | `startVideoOnlyPage(hosts, rules)`: video only is their whole script | `tests/adapters/video-only.spec.ts` |
| `src-tauri/src/page.rs` | input `videoOnly`, status `problems` | unit |
| `src/bar.ts` | ▣ for manifests with `videoOnly` | `tests/video-only.spec.ts` |

Status: `{ aspect, problems: ("controls-missing" | "player-missing")[] }`, at most two.

## Known gaps

- YouTube Shorts: switching video only on or off (also by window mode) changes the size
  of the list, and YouTube then lands on the neighbouring Short. Resizing the window does
  the same on YouTube's own page without floawty, and toggling the class without
  floawty's `resize` event jumped too (live 2026-11-20).
- The ad card stays visible only while YouTube keeps it in `#ads-overlay`; under another
  name it is skipped like the other overlays, without a warning dot.
- Netflix, Prime Video, Disney+ and RTL+ show only their player while playing (maintainer,
  2026-11-18); Netflix's page scrollbar is removed by its own script ([[tech-services]]).
- Twitch's channel list (`NOT_CHANNELS`) is hand-made; a missed page of Twitch's own
  shows the warning dot while video only is on.
