---
type: plan
tags: [package]
status: done
created: 2026-11-26
updated: 2026-11-27
source: visual plan "Kacheln öffnen schneller", rounds 2–3
---

# of-02 – Keep services awake, if the user wants

Plan: [[plan-open-faster]]

## Outcome
With "Keep services awake" on, returning to a service left for the tiles takes under
0.1 s and shows the same page, paused; with the default Off nothing changes.

## Scope
- Owns: `src-tauri/src/service.rs`, `settings.rs` (new field), `overlay.rs`, `page.rs`
  (active webview only), `commands.rs`, `src/settings-panel.ts`, `index.html`,
  `src/i18n.ts`, `src/state.ts`, tests for all of it.
- Non-goals: preloading at start, per-service profiles, a time limit.
- Read first: [[plan-open-faster]] (decided), [[tech-services]], [[tech-shorts]],
  [[home-stays-awake-under-a-service]] (memory levels do not lower private bytes),
  engineering standards §7.
- Needs first: the advisor's check of the design, then a decision record that amends
  §7 ("switching unloads the previous one" unless the user turns keeping awake on).

## Design (advisor check, 2026-11-26)
- Setting `keepAwake: off | last | three` (serde default Off, unknown → Off), file
  version stays 1. Capacity counts the shown webview: Off 1, Last 1, Up to 3 = 3.
- Labels `service-<n>`; one recency-ordered registry; `service::current` is the shown one,
  page.rs and `commands.rs` focus use it. Rules in one pure module (leave, open, trim).
- A return goes through `start_opening` → fit → show → `reveal`, so the home page's
  mark ends and clicks during another opening stay ignored.
- Every per-webview closure captures its number and checks an atomic "shown" number:
  hidden pages never reveal, wake, push zoom, open the browser (host logged) or pop-ups.
- Leaving: page script told to rest, media paused, a resting `play` listener (eval, again
  after every load out of sight), fullscreen left, sign-in closed, WebView2's own
  `SetIsVisible(false)` and `SetIsMuted(true)`, then `hide()`.
- Awake entries match the whole `OpenService`; a changed or removed own tile closes its
  awake webview. A service closed while opening is destroyed, never kept.
- Setting changes go through an async `set_keep_awake` command (trims under
  `SWITCHING`); never from a sync command (main thread, deadlock).
- Help text names a measured range, not one figure; CPU with awake services measured too.
- Quiet: `webview2-com` (2026-11-26) and `windows-core` (2026-11-27) approved by the
  maintainer: hidden services are muted with `IsMuted` (frames and WebAudio included).

## Acceptance criteria
- [x] The setting offers Off, Last service, Up to 3 services; default Off; older
      settings files load as Off.
- [x] Off: behaviour, webview count and idle RAM as before.
- [x] Last: leaving a service for the tiles hides it; its tile shows it again in
      under 0.1 s, same page, video paused; another service closes it.
- [x] Up to 3: a fourth service closes the least recently used awake one.
- [x] A hidden service starts no sound by itself and its page script is not asked.
- [x] Switching to Off and "Reset all data" close every awake service.
- [x] Own pages behave like services; nothing is preloaded at start.
- [x] RAM and CPU with one and three awake services measured hidden; the help text names
      the RAM range.

## Tests first
- Pure rules (Rust): which webview a tile shows, creates or pushes out per setting.
- Settings migration: missing field → Off.
- Hidden app tests with local pages: return without a new request, eviction order,
  Off closes, reset closes, a page that plays while hidden is paused again.

## Checks
- `npm run check`, all hidden app tests, `npm run measure` (idle with Off, RAM with
  awake services) after the yes.

## Evidence (2026-11-27)
- Decision [[services-stay-awake-on-request]]; §7 amended in the engineering standards.
- `windows-core` approved as a direct dependency (maintainer, 2026-11-27): `webview2-com`
  gives the interface types, `windows-core`'s `cast` reaches `ICoreWebView2_8` for muting.
- Red first: `awake.rs` tests failed to compile without the setting; `tests/keep-awake.spec.ts`
  4/6 red on the of-01 build, then 6/6 green; return to an awake service 49 ms.
- Found while testing: Tauri's `hide()` leaves the page "visible" to WebView2, so
  `SetIsVisible(false)` is called directly; over CDP the page still reports "visible",
  so throttling is checked by the CPU measurement, not by a test.
- `TrySuspend` not used (not measured).
- Independent review (advisor): 4 should-fix, 2 nits groups. Fixed: a page that starts
  playing after it was left is paused again (resting `play` listener, re-applied after
  loads; app test); error paths (show fails → closed and loaded anew; hide fails →
  closed; failed add clears the shown entry); a returning service is fitted before it
  shows; tests for the panel segments and the re-pause; a failed mute is logged; module
  header. Recorded instead: a hidden page's fullscreen event stays ungated (it is left
  on leaving and needs a user gesture to come back; `fullscreen.rs` belongs to the page
  fullscreen package); muting and "page script not asked while hidden" have no app test
  (custom pages have no page script; muting is invisible to the page); the return is
  asserted under 300 ms as a margin for under 0.1 s (49–94 ms measured); own tiles can
  only be renamed, never get a new address, so only removed tiles need closing;
  `service.rs` is at 318 of 400 counted lines.

- Live measurement (maintainer's yes, hidden, fresh profile, "Up to 3"): on the tiles
  with YouTube awake 526.7 MB / 0 % CPU, with YouTube, Twitch and TikTok awake 1149.5 MB /
  0.05 % (idle with Off 218.9 MB, of-01): about 310 MB per awake service, no CPU to
  speak of; the help text says "about 300 MB".
- `npm run check` green; all hidden app tests 61/61.
- Budgets with Off (maintainer's yes, hidden): download 3.4 MiB, start 227 ms, idle
  217.7 MB / 0 % (after hover 246.3, animations off 226.0), YouTube 1080p 709.3 MB /
  0.25 % at 70.2 fps, hidden 716.7 MB / 0 %; of-01: 218.9, 244.8, 225.6, 719.2, 707.1 MB.

## Resume here
Done; committed after the maintainer's OK on `claude/cranky-mendeleev-b55d49`, not on `main`.
Unchecked by automation: whether a kept service stays silent on the maintainer's profile.
