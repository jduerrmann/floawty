---
type: research
tags: [mvp, performance, network, services]
status: active
created: 2026-11-18
updated: 2026-11-18
source: npm run measure and maintainer checks, 2026-11-18
---

# MVP measurements and service checks

**Verification:** measured on 2026-11-18 (Windows 11, 32 logical cores, WebView2
157.0.4341.60) with `npm run measure` (driver `tests/measure/`, sampler
`spikes/measure`) against the release build of branch `feat/mvp-08-measure-and-check`.
Budgets: [[stack-by-spike]]; spike values: [[stack-spike-results]].

## Resources (medians over 60 s)

| Metric | MVP | Budget | Spike |
|---|---|---|---|
| Download (portable exe) | 3.3 MiB | ≤ 10 MiB | 4.2 MiB |
| Start → visible window (median of 5) | 46 ms | ≤ 200 ms | 46 ms |
| RAM idle on the tiles | 224 MB, 216 MB after round 2 | ≤ 250 MB | 188 MB |
| RAM YouTube 1080p60, 70 % opacity | 734 MB, 727 MB after round 2 | ≤ 850 MB | 682 MB |
| RAM hidden, paused | 723 MB, 721 MB after round 2 | – | 659 MB |
| CPU YouTube 1080p60 | 0.39 % of all cores | – | 0.55 % |
| CPU idle / hidden | 0 % / 0–0.06 % | ≈ 0 % | ≈ 0 % |

- "After round 2": re-run with the bar, resize, tile, Netflix and Crunchyroll changes;
  start 46 ms and download 3.3 MiB unchanged.
- YouTube played 1080p at 61.9 fps with 3 dropped frames in the 480 × 270 overlay
  (checked in the page by the driver), fresh profile, cookie banner rejected.
- Start and idle run without the debug port; YouTube and hidden with it. The port's
  cost at idle was within noise (four runs: 200, 228, 206, 202 MB).
- Idle RAM is ~35 MB above the spike, YouTube ~50 MB: the bar webview and the page
  scripts. Both stay within budget.

- mvp-10 (free shape, zoom script in every service, zoom off): start 47 ms, idle 216 MB,
  YouTube 1080p 738 MB at 61.5 fps, hidden 730 MB / 0.05 % CPU; within budget.
- Zoom (mvp-10): live-checked by the maintainer on all services, works everywhere,
  no black picture with protected video.

## Network while idle

- `msedgewebview2.exe` network service → `edge.microsoft.com/componentupdater` about
  55 s after start, also with `--disable-background-networking`. It keeps the Widevine
  module current (profile 4.10.3112.0, runtime ships 4.10.3050.1). With
  `--disable-component-update` the connection is gone but Widevine is unavailable,
  PlayReady still works. Within the first minutes it downloads the update (22 MB into a
  fresh profile) through BITS from `msedge.b.tlu.dl.delivery.mp.microsoft.com`, outside
  Chromium's net log (BITS event log). Kept and disclosed: [[webview2-component-updates-disclosed]].
- The known diagnostic connection to the Microsoft 365 range ([[webview2-diagnostics-disclosed]]).
- WPAD proxy look-ups in the local network. Nothing else seen in a 5-minute net log,
  60 s of TCP sampling (every 5 s, no QUIC) and the BITS log.

## Services (maintainer, logged in, 2026-11-18)

| Service | Plays | Sign-in | Notes |
|---|---|---|---|
| YouTube, YouTube Shorts | yes | yes (Google) | Shorts auto mode moves on |
| Netflix | yes | yes | only the player while playing; page scrollbar removed by its script |
| Prime Video | yes | yes | Windows passkey dialog at the password step: Amazon's direct request, same in Edge ([[passkey-prompts-left-to-the-service]]) |
| Disney+ | yes | yes | only the player while playing |
| RTL+ | yes | yes after the fix | "Sign in with Amazon" needed `amazon.de`/`amazon.com` |
| Twitch | yes | yes after the fix | sign-in button was under the bar |
| Apple TV (formerly Apple TV+) | yes | yes after the fix | sign-in button was under the bar; tile "Apple TV" added |
| Crunchyroll | yes | yes | tile and video only added |

- Pop-ups: `window.open` is denied; no service needed it. Page suggestion lists (sign-in
  e-mail) closed when the bar hid, fixed.
- Restored logins after a restart: kept for every service. YouTube's player volume
  survived quit and restart in a fresh profile (changed by keyboard; set by the player
  API it is not stored by YouTube); the maintainer confirmed it on the last build.
- YouTube "video only" in a large overlay (about 1028 × 578): the wider layout trapped
  the player under the masthead; fixed, checked live in Edge.
