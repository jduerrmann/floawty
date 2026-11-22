---
type: decision
area: ui
tags: [design, theme, tiles, settings, bar, accessibility]
status: active
created: 2026-11-21
updated: 2026-11-22
source: visual plan "Startseite und Einstellungen neu gestalten", rounds 1–4, 2026-11-21
---

# floawty's own pages use one glass design that follows Windows light or dark

Amended by [[floawty-theme-choice]] (light or dark by choice, 2026-11-22) and
[[tiles-tilt-with-light]] (hover).

## Context
Home, settings and bar looked improvised: flat colour tiles, browser form controls,
Unicode glyphs in the bar. The maintainer wanted a modern, high-quality look and
chose among three directions, three light variants and three dark backgrounds.

## Decision
- One glass design for home, settings, bar, first-start notice and add-page form,
  with shared design values in one stylesheet.
- Follows Windows light or dark through `prefers-color-scheme`, live, no Rust code.
- Light: "colour glass" tiles tinted in the service colour on a pale indigo-pink
  ground. Dark: the same tiles, subtler, with a glow, on an indigo-pink ground.
- Accent cyan for focus, switches and "Done".
- Over a visible service (a service open, settings closed) the bar is always dark
  glass; on home and settings it follows Windows. The dark is pinned in CSS
  (`color-scheme: dark` on the bar's body over `light-dark()` tokens), never through
  Tauri's theme API, which would set the shared WebView2 profile and darken the
  services too.
- TikTok, Disney+ and Apple TV get lighter `brandColor` values that can tint glass;
  the tile is the only reader of `brandColor`, so no new manifest field.
- Every tile's lower part, where the name sits, is a solid shade dark enough for
  white text at WCAG AA (4.5 : 1); a pure function computes it, a Vitest checks
  every service.
- Settings stay one page, grouped in glass cards; switches instead of checkboxes,
  hotkeys as key chips. Segoe UI, no web font, no icon package, no new dependency.
- No `backdrop-filter`: gradients and shadows only (idle RAM on the tiles is already
  216–224 of 250 MB). No looping animation.

## Alternatives
- Fluent-like calm cards and "cinema" brand tiles – rejected for glass.
- Dark only – rejected: floawty follows Windows.
- Tabs or a sidebar in the settings – rejected: one page with groups.
- Lavender or white accent – rejected: lavender is too close to Twitch, white blurs
  on and off.

## Consequences
- New colours always come in a light and a dark value.
- Page and bar watch the colour scheme; the bar already knows whether a service is
  visible (`serviceId` and `settingsOpen` in its state).
- Icons are SVG files, never `data:` URLs (the CSP allows only `'self'`).
- The CSS build targets Chrome 123, so `light-dark()` is not lowered to variables
  resolved on `:root`; WebView2 is evergreen, older runtimes are not supported.
- Service logos: [[redrawn-service-logos]].
