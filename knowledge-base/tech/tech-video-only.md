---
type: tech
area: services
tags: [video-only, page-script, youtube, twitch]
status: active
created: 2026-11-18
updated: 2026-11-18
source: mvp-07 implementation
---

# "Video only"

The page script lays the service's player over its own page. Decision:
[[video-only-lays-player-over-page]]; bridge and wake-ups: [[tech-shorts]].

## Invariants

- One setting `videoOnly` (default off) for all services, toggled by ▣ in the bar
  (`toggle_video_only`) or the `videoOnly` hotkey (Ctrl+Alt+Shift+V). The page input
  carries `videoOnly = setting && mode == floaty`; `toggle_mode` syncs the page.
- Only styles: one `<style>` element (added on first use) and the class
  `floawty-video-only` on `<html>`. The class is set only when the setting wants it,
  the path is a player page of the adapter and its player exists; otherwise the page
  is untouched, including scrolling. Toggling dispatches a `resize` event, since
  YouTube Shorts size their video only then.
- The player sits at z-index 2200: above YouTube's masthead (2020) and guide (2030)
  and Twitch's navigation (1000), below YouTube's dialogs (2201+). Consent dialogs of
  both services stay above (live-checked 2026-11-18).
- `player-missing` is reported when video only is wanted on a player page whose player
  is still missing 2 s after the last path change; the ▣ button gets the warning dot,
  the log one fixed line per opened service.
- Garbage input keeps the previous setting; the answer is always a valid status.
- Ad Shorts play in full; YouTube's "Sponsored" badge sits outside the player and is
  covered ([[video-only-lays-player-over-page]]).
- Under video only, Shorts keep click to pause, `m` to mute and ↓ to move on (live 2026-11-18).

## Rules per adapter (`selectors.ts`)

| Adapter | Player pages | Player | Extra overrides |
|---|---|---|---|
| YouTube | `www.youtube.com/watch` | `ytd-watch-flexy:not([hidden]) #movie_player` | the hidden watch page stays in the DOM elsewhere |
| YouTube | `www.youtube.com/shorts/…` | `ytd-shorts #shorts-player` | `contain: none` on the Short boxes, which trap fixed children |
| Twitch | `www.twitch.tv`: one path part not in a list of Twitch's own pages, `/videos/<id>` | `.persistent-player .video-player` | box: no transform, overflow or max-height; `main` lifted over the nav |

## Structure

| File | Role | Tests |
|---|---|---|
| `src/services/video-only.ts` | class, style, settle time, missing check | Playwright adapter |
| `src/services/bridge.ts` | frozen `__floawty.sync` in the top frame on the adapter's hosts | Playwright adapter |
| `src/services/youtube/page.ts`, `twitch/page.ts` | wire the rules into `sync` | `tests/adapters/video-only.spec.ts` |
| `src-tauri/src/page.rs` | input `videoOnly`, status `problems` | unit |
| `src/bar.ts` | ▣ for manifests with `videoOnly` | `tests/video-only.spec.ts` |

Status: `{ aspect, problems: ("controls-missing" | "player-missing")[] }`, at most two.

## Known gaps

- Netflix, Prime Video, Disney+ and RTL+: that their playback shows only the player
  is checked with the maintainer's accounts in mvp-08.
- Twitch's channel list (`NOT_CHANNELS`) is hand-made; a missed page of Twitch's own
  shows the warning dot while video only is on.
