---
type: plan
tags: [plan-map, services, tiles, resources]
status: active
created: 2026-11-26
updated: 2026-11-26
source: visual plan "Kacheln öffnen schneller", rounds 1–3, answered 2026-11-26
---

# Plan – Opening a tile feels fast

## Outcome
A click on a tile shows at once that the service opens, nothing flashes white before
the page draws, and whoever turns it on returns to a service they left without
loading it again.
Decisions: [[service-shows-when-page-starts]]; of-02 adds the keep-awake decision.

## Facts (measured 2026-11-26)
- Hidden, fresh profiles, YouTube, Chrome 158 vs WebView2 158, medians of 3: from the
  click, page start 0.05 s vs 0.00 s, first paint 0.52 s vs 0.46 s, largest paint
  1.08 s vs 1.24 s, load 1.21 s vs 1.23 s; without graphics acceleration the same
  ([[mvp-measurements]], probe `tests/measure/open-compare.spec.ts`).
- floawty's own share before the page starts is about 0.05 s; reusing one webview
  would save almost nothing, so it is dropped. The ~3 s on the maintainer's
  logged-in profile come from the page itself (not pursued, maintainer).

## Decided (visual plan, 2026-11-26)
- The clicked tile shows that it opens; the other tiles step back. Further clicks on
  tiles count only after the page took over. The start with the last service shows
  the same. With animations off or reduced motion the sign stands still.
- The service area takes floawty's ground colour instead of white, and the page takes
  over as soon as its first document starts loading, at the latest when loading
  ends, a failure included (offline).
- "Keep services awake" is a setting: Off (default), Last service, Up to 3 services.
  An awake service stays until it is pushed out (another service with "Last", a
  fourth with "Up to 3", least recently used first) or floawty quits. Returning shows
  the same page, the video paused where it was. An awake service is quiet: paused,
  auto mode resting, a page's own restart of playback stopped. Own pages follow the
  same rule. Switching the setting off and "Reset all data" close awake services.
  Nothing is preloaded at start. The help text names the measured memory per service.
- Measured before and after with the comparison probe; each live run asks first.

## Constraints
- Rules 5 (`webview2-com` approved for of-02 to mute hidden services, maintainer
  2026-11-26; no other new dependency), 7 (no service-specific code), 10, 13 (EN/DE in
  `src/i18n.ts`), 14 (independent review per package: both touch Rust and IPC).
- Base commit `d0bfdd7`. Branch of this worktree; one commit per package after OK.

## Packages

| # | Package | Outcome | Depends on |
|---|---|---|---|
| 01 | [[of-01-opening-shown]] | The click shows the opening; no white flash; double clicks ignored | – |
| 02 | [[of-02-keep-awake]] | A setting keeps the last or up to three services awake | 01 |

Order: 01, then the advisor checks 02's design (stored setting, several service
webviews, the §7 change), then 02. Both own `service.rs`, `overlay.rs`, `src/tiles.ts`.
