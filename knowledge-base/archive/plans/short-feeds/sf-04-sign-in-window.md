---
type: plan
tags: [package, services, window]
status: done
created: 2026-11-20
updated: 2026-11-21
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
- Owns: new `src-tauri/src/sign_in.rs` (pure decisions) and `sign_in_window.rs` (the
  window and its close watcher), `service.rs` (`on_new_window`, close with the service),
  `settings.rs` (`OpenService.sign_in_hosts` with `#[serde(default)]`), `overlay.rs`
  (`in_front`, close on hide), `src/tiles.ts`, `src/services/manifest.ts` (`signInHosts`),
  `src/services/tiktok/manifest.ts` (`accounts.google.com`, `appleid.apple.com`,
  `www.facebook.com`), tests, [[tech-services]], CHANGELOG, PRIVACY.md and README (a
  Facebook or Apple sign-in stays in floawty's profile until "Reset all data").
- Non-goals: pop-ups other than sign-in; YouTube or other services (none need it now);
  a user-gesture check (WebView2 has `IsUserInitiated`; wry does not pass it on).
- Read first: [[sign-in-window-for-popups]], [[tech-services]], `service.rs`,
  `navigation.rs`, `settings.rs`, `capabilities/main.json`, Tauri 2.12
  `WebviewBuilder::on_new_window`, `WebviewWindowBuilder::{with_environment, owner_raw}`.

## Step 0 – spike
In a throwaway branch: `on_new_window` → owned `WebviewWindow` with the opener's
environment; check in floawty that (1) Google's GIS pop-up returns to TikTok
(opener/postMessage), (2) Apple's and Facebook's redirect chains stay on the listed
hosts or the service's domains, (3) `window.close()` from the page leaves an empty Tauri
window or not, (4) Tauri's IPC is refused in the pop-up. Record the results here.

## Spike results (branch `spike/sf-04-sign-in`, release build, fresh profile, 2026-11-21)
- Tauri 2.12.6 has what it needs: `on_new_window` → `NewWindowResponse::Create` with a
  `WebviewWindowBuilder` on `features.opener().environment` (shared profile), same
  browser args, `owner_raw(main hwnd)`; no new dependency.
- TikTok's guest dialog offers "Weiter mit Google"; Facebook and Apple buttons also
  request pop-ups. Google: requested → created → `accounts.google.com` loads. Facebook:
  same with `www.facebook.com`. One at a time held: a second request is denied.
- The pop-up has `window.opener` (TikTok) – postMessage can work.
- `window.close()` in the pop-up: wry destroys only the webview's container HWND
  (`add_WindowCloseRequested` → `DestroyWindow`); the Tauri window stays open and empty
  and still counts as open. The real window needs its own close (watch the container).
- Tauri's IPC bridge (`__TAURI_INTERNALS__`, `ipc`) is injected into the pop-up. The only
  capability lists the webviews `main` and `bar`; whether a call from `sign-in` is
  refused is not yet tried (the same applies to the service webview).
- Playwright's `connectOverCDP` does not list the pop-up as a page; raw CDP
  (`/json/list` + WebSocket) reaches it – tests need that path.
- Maintainer's real sign-ins in the spike build (his profile, 2026-11-21): Google, Facebook
  and Apple each signed TikTok in ("hat alles geklappt"). Logged hosts: Google 10
  navigations, all `accounts.google.com`; Facebook only `www.facebook.com`; Apple only
  `appleid.apple.com` – no other host, so `signInHosts` ∪ `allowedDomains` suffices.
- IPC: the service page's call is refused ("Command tiles_state not allowed by ACL"); the
  pop-up probe found no Facebook button that time. The pop-up falls under the same rule
  (no capability lists `sign-in`); the package pins it with a test.

## Behavior
- Open only if: https, host in `signInHosts`, no sign-in window open (label) or being built (a
  flag around `build()`: creation pumps messages, so a double click could pass a label
  check), floawty's main window visible and in the foreground (`overlay::in_front`),
  checked again after building (a hide may arrive meanwhile).
  Otherwise Deny. Any build error → Deny, never panic.
- Window: label `sign-in`, owned by the main window (`owner_raw`, not topmost), centred
  over floawty's own monitor – the position computed from the main window's rect and
  clamped to its work area (`.center()` would use the primary monitor) – page geometry
  ignored; 480 × 640 at the start, resizable. Title "floawty – <host>" of the page shown
  (e.g. "floawty – accounts.google.com"), updated at each page load: it shows where the
  user types and needs no i18n (maintainer, 2026-11-21; "follows the page" after the review).
- Own navigation decision: stay on `signInHosts` ∪ the service's `allowedDomains`, and
  `about:` (the window starts on `about:blank`); else cancel, never `open_in_browser`;
  log the host only.
- No page script, no zoom script, no `on_new_window` in the pop-up; never a wildcard
  capability label. IPC: remote origins are always ACL-checked and no capability lists
  `sign-in` (verified in Tauri 2.12.6 sources by `advisor`); IPC cannot be switched off
  per webview.
- Closed with the service (`close_webview`), on hide (owned windows hide only on
  minimize) and when the page closes itself: wry then destroys only the container HWND,
  so a short-lived thread of `sign_in_window.rs` reads the container once (`with_webview` →
  `ParentWindow`), polls `IsWindow` and `destroy()`s the captured window handle, never by
  label. The bar watcher is unsuitable (it parks while hidden, in the settings and in
  click-through). Event-driven via `webview2-com` was rejected: a new dependency.

## Acceptance criteria
- [x] Settings files with a `lastService` from before load unchanged (no defaults reset).
- [x] TikTok: "Continue with Google/Apple/Facebook" opens the sign-in window; after
      sign-in TikTok is signed in and the window is gone.
- [x] A pop-up from another host (e.g. an ad frame) or while floawty is in the
      background opens nothing.
- [x] A link to another site inside the window does nothing; the log names only the host.
- [x] The pop-up cannot call any floawty command.
- [x] Maintainer live test with a real account.

## Tests first
- Rust unit: open decision (https, host, one at a time, foreground), navigation
  decision, settings parse with and without `signInHosts`.
- Vitest: manifest `signInHosts` validation.
- Playwright: Playwright does not reliably list the pop-up as a page, so the pop-up
  fixture tries one app and one `plugin:` command, posts the errors to `window.opener`
  and closes itself; assert on the opener page and with `ownedPopups` / `windowFlags`
  (`tests/desktop.ts`); a real `clickAt` makes floawty foreground, `openOtherWindow`
  covers the background case. First check whether context routes serve the pop-up;
  fallback a reserved `.test` host over raw CDP. Also: two `window.open` back to back
  give one window; the window sits on floawty's monitor.

## Checks
- `npm run verify`; release app live check; resource measurement (window handling).
- `advisor` before the design is fixed (after the spike) and for the review.

## Evidence (2026-11-21)
- Rust unit tests first (red: `todo!()`): nine for `sign_in.rs` (open: https, exact host,
  one at a time, foreground, none without hosts; navigation; title; placement incl. a monitor
  left of the primary); a settings test for an `OpenService` without `signInHosts` (a
  guard: red only as a compile error before the field existed).
- Vitest first (red): `signInHosts` must be bare lower-case hosts; only TikTok lists them.
- App test `tests/sign-in.spec.ts` (four cases: listed pop-up → one owned window, not
  topmost, IPC refused, `window.close()` closes it, a double `window.open` → one window;
  unlisted host → nothing; background → nothing; closing the service closes it). Written
  after the window code; its red run was skipped – the release build before this package
  denies every pop-up, so the first case cannot pass there.
- `npm run check` green (75 unit, 88 adapter, 123 Rust).

## Review (advisor) and resolution
- High, deadlock: closing the service while the window is built (its message pump runs
  the close nested) – `close_webview` (always a worker thread) waits up to 2 s for a
  build; after building, floawty is checked again and the window destroyed if hidden.
- Medium, mixed DPI: the window is moved before it is sized.
- Decision gap, static title: the title follows each loaded page (maintainer).
- Medium, sticky flag: `BUSY` and its `Destroyed` listener replaced by a flag only around
  `build()` plus the label; late errors destroy the window.
- Tests: "not topmost" dropped (a topmost owner makes owned windows topmost); IPC asserts
  `refused` for an app and a `plugin:` command; attempts are counted so negative cases
  cannot pass without a click; new cases: a page elsewhere is blocked and logged by host,
  the title follows the page, hiding closes the window.
- Notes: tech-services (stale pop-up lines, `signInHosts` in the structure and settings,
  Known gap for a restored `lastService`), gesture wording, file names in this package.
- From the framed-UI task (branch `claude/beautiful-mayer-fb8369`, its decision
  `floawty-ui-never-framed`): app commands from floawty's local origin skip the ACL, and
  `frame-ancestors` does not cover top-level pages, so the sign-in window must never show
  `http://tauri.localhost/` top-level nor answer a pop-up with Allow. Holds: its
  navigation allows only https on `signInHosts`, the service's domains and
  `about:`/`blob:`/`data:`, and it has no pop-up handler (wry denies).
- Not changed: no app-level hard test of the deadlock (needs a sub-second close during a
  build); the maintainer's live test checks typing without a click and a fresh-profile
  sign-in (other provider hosts would be logged as "stayed off").

## App run 1 (maintainer's yes, 2026-11-21)
- `npm run verify`: check green, build green, app tests 38/39. Red: the first sign-in case –
  two `window.open` in one click handler, but the handler never got past the first (it
  counted 1 attempt); the window itself opened, exactly one. The other four sign-in cases
  green. Fix: one task per attempt (the second 500 ms later), the count polled.

## App run 2 (maintainer's yes, 2026-11-21)
- `npm run verify` green (75 unit, 88 adapter, 123 Rust, 39 app tests incl. all five
  sign-in cases).
- `npm run measure`: 3.3 MiB, start 47 ms, idle 231.2 MB / 0 %, YouTube 1080p 684.6 MB /
  0.36 % – within budget. The "hidden" scenario failed in the measuring script itself
  (`spikes/measure/measure.ps1:74`: a process of floawty's tree ended during sampling, its
  CPU time could not be read); not seen in earlier runs.
- `npm run measure` again (maintainer's yes): 3.3 MiB, start 31 ms, idle 220.8 MB / 0 %,
  YouTube 1080p 726.4 MB / 0.29 %, hidden 0 % CPU – all three green, within budget.

## Live test (maintainer, 2026-11-21)
- Release build of app run 2, his own profile: the TikTok sign-in through the small
  window worked ("Getestet, passt"): window over floawty, titled by the provider's host,
  typing without a click, closed by itself, TikTok signed in.

## Resume here
Done (2026-11-21): all criteria met, archived. The spike branch `spike/sf-04-sign-in` and
its worktree are throwaway.
