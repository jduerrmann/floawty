---
type: decision
area: ui
tags: [tiles, symbols, trademarks, license]
status: active
created: 2026-11-17
updated: 2026-11-17
source: conversation (mvp-04, logo sources checked 2026-11-17)
---

# Service tiles show floawty's own SVG symbols, not the services' logos

Supersedes [[bundled-service-logos]].

## Context

A search of the services' official brand and press pages (2026-11-17) found a
downloadable logo only for Twitch (ZIP) and Disney+ (PNG); YouTube, Netflix, Prime
Video and RTL+ offered none that could be found, and no page stated rules for third
parties. Bundling marks under such unclear terms is a legal risk for an open-source
repository.

## Decision

- Every tile shows an SVG symbol drawn for floawty: white strokes on the service's
  brand colour, with the service name below. Custom pages get a globe, "+" a plus.
- Symbols are floawty's own work under GPL-3.0, in `src/assets/symbols/`. Each file
  states which service it stands for and that it is not that service's logo.
- A symbol never imitates a logo (no red play triangle, no stylised Netflix "N").

## Alternatives

- Official logos – rejected: no reliable source and unclear terms for four of six.
- Letters only – rejected by the maintainer in favour of drawn symbols.

## Consequences

- No third-party assets and no `assets/third-party/` folder are needed.
- A new service needs a new symbol drawn in the same style.
