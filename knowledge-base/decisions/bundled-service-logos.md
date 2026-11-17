---
type: decision
area: ui
tags: [tiles, logos, trademarks, license]
status: archived
created: 2026-11-17
updated: 2026-11-17
source: visual plan "MVP-Planung", round 2
---

# Service tiles show the official logos, kept apart from the GPL code

**Superseded by [[own-service-symbols]]** (2026-11-17): no reliable official sources;
tiles use floawty's own SVG symbols.

## Context

The maintainer wants "real app tiles". Options were own symbols in the brand colour,
the service's own icon picked up after the first visit, or bundled official logos.

## Decision

- floawty ships the official logos of the services that have a tile.
- They live in `assets/third-party/logos/` with a `NOTICE.md`: the logos are
  trademarks of their owners, used only to identify the service, not covered by
  floawty's GPL-3.0 licence, and floawty is not affiliated with the services.
- Each logo is taken from the owner's official brand or press resources where
  available; its source is noted in `NOTICE.md`.
- If an owner objects, or its brand rules forbid the use, the logo is replaced by an
  own symbol in the brand colour.
- Custom URL tiles get an own neutral symbol.

## Alternatives

- Own symbols in brand colour – rejected: less recognisable.
- The service's own icon after the first visit – rejected: placeholders until then.

## Consequences

- Invariant 1 (no closed parts) holds for floawty's own work; third-party marks are
  documented as such.
- Logos change over time; updating one is a small `fix(<service>)` task.
