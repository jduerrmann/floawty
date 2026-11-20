---
type: plan
tags: [package, services, window]
status: planned
created: 2026-11-20
updated: 2026-11-20
source: visual plan "Shorts-Scrollen und TikTok", 2026-11-20; advisor plan check
---

# sf-04 – Sign-in window for pop-ups

Plan: [[plan-short-feeds]] · Decision: [[sign-in-window-for-popups]]

## Outcome
When a service page opens a sign-in pop-up to one of its manifest's `signInHosts`,
floawty shows it in a small window owned by floawty, in the shared WebView2 profile;
the provider returns to the service page and the window closes. All other pop-ups stay
denied as today.

## Scope
- Owns: a new `src-tauri/src/sign_in.rs` (pure decisions + window), `service.rs`
  (`on_new_window`), `settings.rs` (`OpenService.sign_in_hosts` with
  `#[serde(default)]`), `bar.rs` watcher (closing an emptied window), `overlay.rs`
  (close on hide and with the service), `src/services/manifest.ts` (`signInHosts`),
  `src/services/tiktok/manifest.ts` (`accounts.google.com`, `appleid.apple.com`,
  `www.facebook.com`), `src/i18n.ts` (title), tests, [[tech-services]], CHANGELOG.
- Non-goals: pop-ups other than sign-in; YouTube or other services (none need it now);
  a user-gesture check (WebView2 does not pass one).
- Read first: [[sign-in-window-for-popups]], [[tech-services]], `service.rs`,
  `navigation.rs`, `settings.rs`, `capabilities/main.json`, Tauri 2.12
  `WebviewBuilder::on_new_window`, `WebviewWindowBuilder::{with_environment, owner_raw}`.

## Step 0 – spike
In a throwaway branch: `on_new_window` → owned `WebviewWindow` with the opener's
environment; check in floawty that (1) Google's GIS pop-up returns to TikTok
(opener/postMessage), (2) Apple's and Facebook's redirect chains stay on the listed
hosts or the service's domains, (3) `window.close()` from the page leaves an empty Tauri
window or not, (4) Tauri's IPC is refused in the pop-up. Record the results here.

## Behavior
- Open only if: https, host in `signInHosts`, no sign-in window open, floawty's main
  window visible and in the foreground. Otherwise Deny. Any build error → Deny, never panic.
- Window: label `sign-in`, owned by the main window (not topmost), fixed size centred
  over floawty, page geometry ignored, title "floawty – Sign in" / "floawty – Anmelden".
- Own navigation decision: stay on `signInHosts` ∪ the service's `allowedDomains`
  (Apple and Facebook return to the service), else cancel; log the host only.
- No page script, no zoom script, no `on_new_window` in the pop-up; never a wildcard
  capability label.
- Closed with the service, on hide and when the page closes itself.

## Acceptance criteria
- [ ] Settings files with a `lastService` from before load unchanged (no defaults reset).
- [ ] TikTok: "Continue with Google/Apple/Facebook" opens the sign-in window; after
      sign-in TikTok is signed in and the window is gone.
- [ ] A pop-up from another host (e.g. an ad frame) or while floawty is in the
      background opens nothing.
- [ ] A link to another site inside the window does nothing; the log names only the host.
- [ ] The pop-up cannot call any floawty command.
- [ ] Maintainer live test with a real account.

## Tests first
- Rust unit: open decision (https, host, one at a time, foreground), navigation
  decision, settings parse with and without `signInHosts`.
- Vitest: manifest `signInHosts` validation.
- Playwright: pop-up from a routed fixture opens the window (context-level routes);
  IPC refused in it.

## Checks
- `npm run verify`; release app live check; resource measurement (window handling).
- `advisor` before the design is fixed (after the spike) and for the review.

## Resume here
Not started. Next action: Step 0 spike.
