---
type: decision
area: services
tags: [page-script, ipc, privacy, shorts]
status: active
created: 2026-11-17
updated: 2026-11-17
source: visual plan "mvp-06 Shorts-Auto-Modus", rounds 1–2; advisor second opinion
---

# Page scripts are asked by floawty; service pages never call floawty

## Context
The Shorts auto mode needs a page script inside youtube.com that tells floawty when
the overlay should turn portrait and when its selectors broke. Service pages have no
IPC at all ([[tech-services]]), and polling costs resources (engineering standards §7).

## Decision
- The page script exposes one function, `window.__floawty.sync(input)`, that takes
  floawty's settings and the hover state and returns a small status (aspect, problem).
- floawty calls it with `eval_with_callback` only when woken: the service page's title
  changed (the title itself is discarded), a page load finished, a setting or the hover
  changed, and once a few seconds after a title change for the problem check.
- The answer is untrusted: length-capped, parsed into closed enums, fixed log texts.
- The script is chosen by the validated service id from build output (`page/<id>.js`),
  runs only in the top frame on the adapter's own hosts, and never imports Tauri.

## Alternatives
- One narrow command allowed for `https://*.youtube.com` – rejected: any script on the
  page, ads included, could call it, and it needs an ACL manifest for all commands.
- Polling once a second – rejected by the maintainer: the URL change is enough.
- Title or custom-scheme side channel carrying data – rejected: YouTube owns the title,
  watched titles would reach floawty, and a scheme needs a top-level navigation.

## Consequences
Service pages keep zero IPC. A missed title event delays the portrait switch until the
next one. Other adapters reuse `sync` and the same wake-ups.
