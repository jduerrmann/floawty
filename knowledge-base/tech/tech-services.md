---
type: tech
area: services
tags: [tiles, services, webview, navigation, privacy]
status: active
created: 2026-11-17
updated: 2026-11-18
source: mvp-04 implementation, mvp-05
---

# Services and tiles

The home page in floawty's own webview shows one tile per service, the user's own
pages and "+". A tile opens the service in a second webview that lies over the home
page inside the main window.

## Invariants

- One service webview at a time (label `service`); opening another closes it first.
- Service webviews share floawty's WebView2 profile ([[shared-webview2-profile-in-mvp]])
  and need the **same browser arguments** as the main window (`service.rs`
  `BROWSER_ARGS` = `tauri.conf.json`), or WebView2 refuses the shared environment.
- **Service pages get no IPC:** the capability `main` lists only floawty's own
  webviews `main` and `bar` and no remote origin; `__TAURI_INTERNALS__` exists in service pages, but every
  command is refused ("not allowed by ACL", checked for all commands). Adapter page
  scripts are asked by floawty instead ([[tech-shorts]]).
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
| `src/services/<id>/manifest.ts` | id, name, start URL, allowed domains (incl. sign-in), brand colour, symbol, `shortsAutoMode` (YouTube, YouTube Shorts), `videoOnly` (YouTube, YouTube Shorts, Twitch, Crunchyroll; [[tech-video-only]]), `startsShortsAuto` (the Shorts tile turns the auto mode on before opening) | Vitest, Playwright |
| `src/services/manifest.ts` | manifest validation, `hostAllowed` | Vitest |
| `src/custom-tiles.ts` | own pages: name and URL rules, https added, duplicates, allowed domain = host without `www.` | Vitest |
| `src/tiles.ts`, `src/home.ts` | tiles, options menu (rename, remove), add/rename form, first-start notice | Playwright |
| `src/assets/symbols/*.svg` | floawty's own symbols; Vite emits them as files (`assetsInlineLimit: 0`) so the CSP needs no `data:` | Vitest (files exist) |
| `src-tauri/src/service.rs` | open/close the service webview, navigation guard, pause on hide, play/pause, cover for the settings, focus | Playwright, check scripts |
| `src-tauri/src/navigation.rs` | stay or open in the browser | unit |
| `src/services/netflix/page.ts` | no page scrollbar on `/watch/` (Navigation API follows page changes) | `tests/adapters/netflix.spec.ts` |
| `src-tauri/src/commands.rs` | `tiles_state`, `accept_notice`, `set_custom_tiles`, `open_service` / `close_service` (async) | Playwright |

Settings gain `noticeAccepted`, `customTiles`, `lastService` (id, URL, allowed
domains) and the hotkey `playPause` (Ctrl+Alt+Shift+Space).

Tests run the release build with `FLOAWTY_DATA_DIR` and `WEBVIEW2_USER_DATA_FOLDER`
set to fresh temporary folders (`tests/app.ts`), so they never touch the user's data.

## Known gaps

- A tile id is also its page-script key (`page/<id>.js`): `youtube-shorts` has its own
  entry that imports the YouTube script. Per-service profiles must give it the
  `youtube` profile, or the sign-in splits.

- `window.open` pop-ups are denied (wry's default without a handler); sign-ins that
  need one fail. Live checks 2026-11-18: [[mvp-measurements]]. Sign-in domains outside
  the service: Google (YouTube), Amazon (Prime Video, RTL+ "Sign in with Amazon").
- Prime Video's password step shows the Windows passkey dialog: Amazon's own direct
  request, the same in Edge; left alone ([[passkey-prompts-left-to-the-service]]).
- `lastService` stores the allowed domains it was opened with: a restored service keeps
  them until it is opened from its tile again, so manifest changes reach it only then.
