---
type: decision
area: services
tags: [resources, webview, setting]
status: active
created: 2026-11-27
updated: 2026-11-27
source: visual plan "Kacheln öffnen schneller", rounds 2–3, maintainer 2026-11-26
---

# Services stay awake only when the user asks for it

Amends engineering standards §7 ("one active service at a time; switching unloads the
previous one").

## Context
Opening a service waits for the page's own loading (1–3 s), which floawty cannot make
faster ([[service-shows-when-page-starts]]). Only a page that never went away comes back
at once, and each one costs several hundred MB, while the idle budget on the tiles is
260 MB.

## Decision
- A setting "Keep services awake": Off (default), Last service, Up to 3 services
  (`keepAwake`: `off`, `last`, `three`; unknown values read as Off).
- At most one service is shown. With Last, the service left for the tiles stays loaded
  until another one opens; with Up to 3, at most three stay loaded, shown one included,
  and the least recently used goes first. Otherwise until floawty quits.
- A loaded service out of sight is hidden, paused, muted through WebView2
  (`webview2-com`, approved for this) and gets no page-script, zoom, browser or pop-up
  actions. Returning shows the same page as it was left.
- Nothing is loaded before the user opens it; switching to Off closes every awake one.

## Alternatives
- Always keep the last service for 3 minutes – costs memory on every PC without asking.
- A time limit – the maintainer chose "until pushed out".
- A single switch for the last service – no quick change between several services.
- Hiding the home page or lowering memory levels – too little saved
  ([[home-stays-awake-under-a-service]]).

## Consequences
- Budgets are measured with Off; with keeping awake the memory is the user's choice
  and the setting names a measured range.
- Several service webviews exist at once: labels `service-<n>`, every per-webview
  callback checks it is the shown one.
