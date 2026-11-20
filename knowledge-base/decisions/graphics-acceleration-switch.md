---
type: decision
area: services
tags: [webview2, gpu, drm, settings]
status: active
created: 2026-11-18
updated: 2026-11-20
source: conversation
---

# Graphics acceleration is a plain browser setting that restarts floawty

## Context
A Discord screen share of floawty showed Crunchyroll as a black picture; in Edge it
works once "Use graphics acceleration" is off. With the GPU, WebView2 offers PlayReady
SL3000 (hardware DRM), whose picture Windows keeps out of screen captures. WebView2's
browser arguments are fixed when the shared environment starts.

## Decision
- A setting "Use graphics acceleration" / „Grafikbeschleunigung verwenden", on by
  default, only in the settings panel; its note names the cost (more CPU, services
  with copy protection may play in lower quality), not screen sharing.
- Off starts all webviews with `--disable-gpu` (one source, `service::browser_args`).
  WebView2 then offers no PlayReady at all; the services pick what the browser offers,
  floawty changes nothing in their DRM ([[core-principles]] 7).
- Switching asks "Restart floawty now?" in place and restarts; Cancel undoes the
  switch, so the stored value always matches the running arguments.
- Budgets ([[stack-by-spike]]) apply with acceleration on; off is documented only.

## Alternatives
- Name it after its purpose ("for screen sharing (Discord)") – advertises sharing
  protected content, too close to principle 7.
- Take effect at the next start without asking – easy to forget, the switch would
  seem broken.
- Act immediately by recreating all webviews – a restart in disguise, since the
  arguments belong to the one shared environment.
- `--disable-gpu-compositing` – also drops PlayReady and keeps more of the GPU, but is
  not what Edge does and is unchecked against Crunchyroll; not pursued.
- An opaque bar without the GPU – not needed: the transparent bar, opacity and
  click-through work without the GPU (probe, mvp-11).

## Consequences
- Without the GPU, PlayReady services (Netflix 1080p) fall back to Widevine and may
  play in lower quality; with the switch off, the maintainer saw Crunchyroll in a
  Discord stream and all DRM services play (2026-11-20).
- Any new webview must take `service::browser_args`, or WebView2 refuses it.
