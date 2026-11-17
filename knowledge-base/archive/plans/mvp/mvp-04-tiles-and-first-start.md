---
type: plan
tags: [package, mvp, services, ui]
status: done
created: 2026-11-17
updated: 2026-11-17
source: conversation
---

# mvp-04 – App tiles and first start

Plan: [[plan-mvp]] · Current state: [[tech-services]]

## Outcome

floawty opens with app tiles, opens a service over its home page, saves custom URLs
as tiles, and shows the WebView2 notice once.

## Acceptance criteria

- [x] Tiles: YouTube, Twitch, Netflix, Prime Video, Disney+, RTL+, custom tiles and
      "+". **Changed:** own SVG symbols instead of official logos
      ([[own-service-symbols]]) – no reliable logo sources; no NOTICE needed.
- [x] "+" asks for a name and a web address; the tile is saved, can be renamed and
      removed.
- [x] A tile opens the service in the shared profile; opening another closes the
      previous webview.
- [x] Navigation stays on the allowed domains (incl. sign-in domains); other links
      open in the default browser. **Live sign-in flows not checked** (mvp-08).
- [x] First start: notice above the tiles, one OK, stored, EN/DE, not shown again.
- [x] Start opens the last used service; with none, the tiles.
- [x] Service pages get no IPC access (all commands refused by the ACL).
- [x] Hiding pauses the video; Ctrl+Alt+Shift+Space plays/pauses.

## Evidence (2026-11-17)

- Tests first: manifest, custom-tile and navigation tests red on their assertions,
  then green; `npm run verify` green (18 Vitest, 38 Rust, 6 Playwright); exe 3.17 MiB.
- Playwright (fresh profile per test): tiles, notice once across restart, own page
  saved/renamed/removed across restart, tile opens example.com and it reopens on
  start, mode switches with a service open.
- Check scripts on the release build: service page `invoke` refused for every
  command; `file://` navigation blocked; a playing video pauses on hide, resumes and
  pauses with Ctrl+Alt+Shift+Space; video keeps playing across a mode switch (the
  open point from mvp-03).
- Bugs found and fixed: reopening the last service during setup crashed WebView2
  (now after setup); every window action crashed once a service was open
  (`get_webview_window` → `get_window`, with a red-then-green Playwright test);
  `[hidden]` was overridden by `display` rules; SVGs inlined as `data:` were blocked
  by the CSP (`assetsInlineLimit: 0`).
- Screenshot check of the home page with symbols and with the notice.

## Moved on

- Click-through dot hidden behind a service, way back to the tiles → mvp-05.
- Live sign-in and pop-up behaviour of the real services → mvp-08.

## Resume here

Done. Next: [[mvp-05-bar-settings-i18n]].
