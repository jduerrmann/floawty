---
type: plan
tags: [package, mvp, services, ui]
status: planned
created: 2026-11-17
updated: 2026-11-17
source: conversation
---

# mvp-04 – App tiles and first start

Plan: [[plan-mvp]]

## Outcome

floawty opens with app tiles, opens a service in the overlay, saves custom URLs as
tiles, and shows the WebView2 notice once.

## Scope

- Owns: `src/services/<id>/manifest.ts` per service, tile view in `src/`, custom tile
  storage in settings, `assets/third-party/logos/` with `NOTICE.md`, service webview
  creation (shared profile, navigation limits).
- Non-goals: bar (05), page scripts (06, 07).
- Read first: [[bundled-service-logos]], [[shared-webview2-profile-in-mvp]],
  [[webview2-diagnostics-disclosed]], [[drm-services-in-first-release]], AGENTS.md
  rule 7 (adapters).

## Acceptance criteria

- [ ] Tiles: YouTube, Twitch, Netflix, Prime Video, Disney+, RTL+ with official logos
      (source noted in `NOTICE.md`), plus custom tiles and a "+" tile.
- [ ] "+" asks for a URL and a name; the tile is saved, can be renamed and removed.
- [ ] A tile opens the service in one shared WebView2 profile; switching closes the
      previous service webview.
- [ ] Navigation stays within the service's allowed domains (incl. sign-in domains);
      other links open in the default browser.
- [ ] First start: cookie-banner-like notice above the tiles, one OK, stored; English
      and German text; never shown again.
- [ ] Start opens the last used service; with none, the tiles.
- [ ] Service pages get no IPC access.

## Tests first

- Vitest: manifest validation (every service has id, name, URL, domains, logo),
  custom tile validation (URL, name, duplicates), navigation allow-list matching.

## Checks

- `npm run verify`; Playwright: tiles render, "+" saves a tile, notice shown once.

## Resume here

Not started.
