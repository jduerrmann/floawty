---
type: decision
area: ui
tags: [tiles, logos, trademarks, license]
status: active
created: 2026-11-21
updated: 2026-11-21
source: visual plan "Startseite und Einstellungen neu gestalten", round 4, and the maintainer's answer, 2026-11-21
---

# Service tiles show redrawn logos of the services, kept apart from the GPL code

Supersedes [[own-service-symbols]].

## Context
For the glass design the maintainer wanted the tiles to look premium and chose the
services' real logos over three styles of own symbols. Official files were found for
only two of six services on 2026-11-17, and brand rules generally forbid altering a
logo (colour, effects), which the glass tiles do.

## Decision
- floawty redraws the logos of all ten tile services as SVG, as close to the
  originals as possible, and shows them with the glass effects (tint, glow, shadow).
- The files live in `src/assets/logos/` with a `NOTICE.md`: the logos are
  trademarks of their owners, shown only to identify the service, not covered by
  floawty's GPL-3.0 licence; floawty is not affiliated with the services. NOTICE
  records provenance: drawn by hand for floawty against the service's site as
  reference, with the date; no path data copied from the owners' files.
- A manifest's `symbol` may point to `logos/` or `symbols/`. If an owner objects,
  that service gets an own symbol again in the next release.
- Custom pages keep the globe, "+" keeps the plus (floawty's own work).
- Invariant 1 ("no closed parts") covers floawty's own work; the services' logos
  are a named exception with NOTICE (maintainer's OK, 2026-11-21), noted in
  [[core-principles]] and AGENTS.md.
- The settings show one small line, EN and DE: the logos are trademarks of their
  owners, floawty is not affiliated with the services.

## Alternatives
- Own symbols in three styles (fine lines, filled, app icon) – rejected by the
  maintainer: less recognisable.
- Official files unaltered, redrawn only where none exist – rejected: mixed look,
  and the glass effects alter them anyway.

## Consequences
- The maintainer accepts the risk of a complaint or a takedown request; the
  maintainer was told the logos break typical brand rules by the glass effects.
- README and the licence section name the trademark exception.
- A new service needs its logo redrawn the same way, or an own symbol.
