---
type: tech
area: services
tags: [tiles, services, webview, navigation, privacy]
status: active
created: 2026-11-17
updated: 2026-11-21
source: mvp-04 implementation, mvp-05
---

# Services and tiles

The home page in floawty's own webview shows one tile per service, the user's own
pages and "+". A tile opens the service in a second webview that lies over the home
page inside the main window.

## Invariants

- One service webview at a time (label `service`); opening another closes it first.
- Service webviews share floawty's WebView2 profile ([[shared-webview2-profile-in-mvp]])
  and need the **same browser arguments** as the main window, or WebView2 refuses the
  shared environment: main window, bar and service all take `service::browser_args`
  (from the setting `graphicsAcceleration`, `--disable-gpu` when off); `tauri.conf.json`
  sets none.
- **Service pages get no IPC:** the capability `main` lists only floawty's own
  webviews `main` and `bar` and no remote origin; `__TAURI_INTERNALS__` exists in service pages, but every
  command is refused ("not allowed by ACL", checked for all commands). Adapter page
  scripts are asked by floawty instead ([[tech-shorts]]).
- **Pop-ups:** every pop-up is denied, except a sign-in pop-up: https, its host exactly
  in the manifest's `signInHosts` (stored in `OpenService.signInHosts`, `serde(default)`),
  no sign-in window open (its label) or being built (`BUILDING`, set around `build()`, whose
  message pump can deliver a second request, a hide or a close), floawty visible and in
  the foreground (`overlay::in_front`), checked again after building. It opens as the window `sign-in`
  (`sign_in_window.rs`; decisions in pure `sign_in.rs`): the opener's WebView2
  environment (shared profile, `window.opener` intact; it brings the browser arguments),
  owned by the main window (not topmost), 480 × 640 logical at the start (resizable),
  centred over floawty inside its monitor's work area (position before size, so a move
  across monitor scales does not rescale it), titled "floawty – <host>" after each
  loaded page. Its
  navigation stays on `signInHosts` ∪ `allowedDomains` and `about:`/`blob:`/`data:`;
  anything else is cancelled (never the browser), host logged. No page or zoom script,
  no pop-ups of its own, no capability (IPC refused as in service pages). Closed with
  the service (`close_webview` first waits up to 2 s for a build: closing the service
  meanwhile deadlocks WebView2's setup), on hide, and when its page calls `window.close()`: wry then destroys only
  the webview's container, so a thread polls `IsWindow` on it (300 ms) and destroys the
  window ([[sign-in-window-for-popups]]). TikTok lists `accounts.google.com`,
  `appleid.apple.com`, `www.facebook.com` (live 2026-11-21: each flow stayed on its host).
- **floawty's own pages never load in a frame:** the CSP contains
  `frame-ancestors 'none'`, because app commands from floawty's origin skip the ACL
  (no app manifest). The CSP has no `connect-src` for `ipc.localhost`, so floawty's
  UI uses Tauri's postMessage IPC; keep it so ([[floawty-ui-never-framed]]).
- Top-level navigation stays on the service's `allowedDomains` and their subdomains;
  `about:`, `blob:` and `data:` stay; http(s)/mailto elsewhere open in the default
  browser, other schemes (e.g. `file:`) are dropped. Only the host is logged.
- With a service inside, the main window is no longer a `WebviewWindow`: window code
  uses `get_window("main")` (`overlay::main_window`).
- The last service is reopened **after** setup (async task): adding the webview
  during setup crashes WebView2.
- Tiles never use the services' logos ([[own-service-symbols]]).
- The bar webview lies above the service; opening a service raises it again
  ([[tech-bar-and-settings]]). While the settings are open the service is paused and
  hidden (`service::cover`).

## Structure

| File | Role | Tests |
|---|---|---|
| `src/services/<id>/manifest.ts` | id, name, start URL, allowed domains (incl. sign-in), `signInHosts` (TikTok), brand colour, symbol, `shortsAutoMode` (YouTube, YouTube Shorts, TikTok), `videoOnly` (YouTube, YouTube Shorts, TikTok, Twitch, Crunchyroll; [[tech-video-only]]), `startsShortsAuto` (the Shorts and TikTok tiles turn the auto mode on before opening) | Vitest, Playwright |
| `src/services/manifest.ts` | manifest validation (`signInHosts` bare hosts), `hostAllowed` | Vitest |
| `src/custom-tiles.ts` | own pages: name and URL rules, https added, duplicates, allowed domain = host without `www.` | Vitest |
| `src/tiles.ts`, `src/home.ts` | tiles, options menu (rename, remove), add/rename form, first-start notice | Playwright |
| `src/assets/symbols/*.svg` | floawty's own symbols; Vite emits them as files (`assetsInlineLimit: 0`) so the CSP needs no `data:` | Vitest (files exist) |
| `src-tauri/src/service.rs` | open/close the service webview, navigation guard, pause on hide, play/pause, cover for the settings, focus | Playwright, check scripts |
| `src-tauri/src/navigation.rs` | stay or open in the browser | unit |
| `src-tauri/src/sign_in.rs`, `sign_in_window.rs` | sign-in pop-ups: open, navigation, title and place (pure); the owned window and its close watcher | unit, `tests/sign-in.spec.ts` |
| `src/services/_zoom/page.ts` | in every service: frozen `__floawtyZoom(on)` (a frozen no-op outside http(s)); scales the largest video to the view's width when on, the view is wider than 16:9 (× 1.01), the picture (letterboxed by `object-fit: contain`) fills ≥ 95 % of the height, the box is centred, the page applies no transform of its own and the scale is ≤ 1.5; window `resize`, captured `loadedmetadata`/`resize` and a ResizeObserver on the main video, no polling | `tests/adapters/zoom.spec.ts` |
| `src/services/netflix/page.ts` | no page scrollbar on `/watch/` (Navigation API follows page changes) | `tests/adapters/netflix.spec.ts` |
| `src-tauri/src/commands.rs` | `tiles_state`, `accept_notice`, `set_custom_tiles`, `open_service` / `close_service` (async) | Playwright |

Settings gain `noticeAccepted`, `customTiles`, `lastService` (id, URL, allowed
domains, sign-in hosts) and the hotkey `playPause` (Ctrl+Alt+Shift+Space): it pauses every playing video and audio,
or else plays the video across the middle of the window (else the page's only video) –
`src-tauri/src/play_pause.js`, tested in `tests/adapters/play-pause.spec.ts`; feeds like
TikTok keep the previous item's video in the page.

Tests run the release build with `FLOAWTY_DATA_DIR` and `WEBVIEW2_USER_DATA_FOLDER`
set to fresh temporary folders (`tests/app.ts`), so they never touch the user's data,
and with `--mute-audio`, so they stay silent.

## Known gaps

- A custom tile `http://tauri.localhost/` shows floawty's home page top-level in the
  service webview, where app commands work; accepted. The sign-in window cannot show it
  (https on its hosts only, no pop-ups), so the app manifest stays unneeded
  ([[floawty-ui-never-framed]]).

- A tile id is also its page-script key (`page/<id>.js`): `youtube-shorts` has its own
  entry that imports the YouTube script. Per-service profiles must give it the
  `youtube` profile, or the sign-in splits.

- `window.open` pop-ups are denied except a service's listed sign-in pop-ups (see
  Invariants); a service without `signInHosts` whose sign-in needs a pop-up fails. A
  provider step through another host is cancelled and logged ("sign-in window stayed
  off: <host>"), then the host belongs in `signInHosts`. Live checks 2026-11-18: [[mvp-measurements]]. Sign-in domains outside
  the service: Google (YouTube), Amazon (Prime Video, RTL+ "Sign in with Amazon").
- Prime Video's password step shows the Windows passkey dialog: Amazon's own direct
  request, the same in Edge; left alone ([[passkey-prompts-left-to-the-service]]).
- Zoom: videos inside shadow roots or iframes get none (unverified which services);
  subtitles drawn into the video picture itself are cut with the bottom.
- `lastService` stores the allowed domains and sign-in hosts it was opened with: a
  restored service keeps them until it is opened from its tile again, so manifest
  changes reach it only then – a TikTok restored from before sf-04 denies its sign-in
  pop-ups until its tile is used once.
