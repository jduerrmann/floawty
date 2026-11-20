---
type: decision
area: services
tags: [sign-in, popup, security, tiktok]
status: active
created: 2026-11-20
updated: 2026-11-20
source: visual plan "Shorts-Scrollen und TikTok", rounds 2–3, 2026-11-20; advisor check
---

# Sign-in pop-ups open in a small window owned by floawty

## Context
TikTok's "Continue with Google / Apple / Facebook" each call `window.open`
(accounts.google.com, appleid.apple.com, www.facebook.com; live 2026-11-20). floawty's
service webview denies every pop-up (wry's default), so these sign-ins fail without a
word. Email, phone and QR code work inside tiktok.com.

## Decision
- A manifest lists its sign-in pop-up hosts in a new field `signInHosts`; only a
  pop-up whose first URL is https on one of them opens. All other pop-ups stay denied.
- The pop-up opens as one window labelled `sign-in`, in the opener's WebView2
  environment (shared profile, opener and postMessage intact), owned by floawty's main
  window (not topmost), with a fixed size centred over floawty and the title
  "floawty – Sign in" / "floawty – Anmelden". It opens only while floawty's main window
  is visible and in the foreground, and only one at a time.
- Its own navigation rule: stay on `signInHosts` ∪ the service's `allowedDomains`;
  anything else is cancelled, never opened in the browser (an OAuth redirect must not
  land there); the log names the host only.
- No page script, no zoom script, no further pop-ups, no capability. Closed with the
  service, on hide and when the page closes itself. Errors deny; nothing panics.
- `OpenService` stores the hosts with `#[serde(default)]`, so older settings files load.
- The feed behind the window keeps running.

## Alternatives
- A hint in the bar instead of a window – Google, Apple and Facebook would stay blocked.
- A line in the README only – leaves users stuck without explanation.
- Reusing `allowedDomains` for pop-ups – every `target=_blank` or `window.open` inside a
  service would become a second player window, and the service view itself could
  browse Google, Apple and Facebook.
- `NewWindowResponse::Allow` (WebView2's own pop-up) – no navigation rule, no owner, may
  open behind the overlay.
- A topmost window – wrong in window mode and outlives the main window.

## Consequences
- Rule 9 of AGENTS.md lists the sign-in window in scope; [[tech-services]] documents it.
- A sign-in made here is in the shared profile, so a Google session is also YouTube's
  ([[shared-webview2-profile-in-mvp]]).
- Any frame of an allowed service page can request the pop-up; the host list, https and
  the foreground check bound it. WebView2 passes no user-gesture flag.
- Implemented by [[sf-04-sign-in-window]]; the spike there may refine the close handling.
