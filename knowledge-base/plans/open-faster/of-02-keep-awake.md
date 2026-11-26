---
type: plan
tags: [package]
status: planned
created: 2026-11-26
updated: 2026-11-26
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
- Non-goals: preloading at start, per-service profiles, muting through WebView2's
  COM API (new dependency), a time limit.
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
- Leaving: pause, page script told inactive, quiet script (own file, init script, re-applied
  on load), sign-in closed, `hide()` (wry also calls `SetIsVisible(false)`).
- Awake entries match the whole `OpenService`; a changed or removed own tile closes its
  awake webview. A service closed while opening is destroyed, never kept.
- Setting changes go through an async `set_keep_awake` command (trims under
  `SWITCHING`); never from a sync command (main thread, deadlock).
- Help text names a measured range, not one figure; CPU with awake services measured too.
- Open: quiet script is best effort (shadow DOM, iframes, WebAudio escape it) unless the
  maintainer approves `webview2-com` for `IsMuted`/`TrySuspend`.

## Acceptance criteria
- [ ] The setting offers Off, Last service, Up to 3 services; default Off; older
      settings files load as Off.
- [ ] Off: behaviour, webview count and idle RAM as before.
- [ ] Last: leaving a service for the tiles hides it; its tile shows it again in
      under 0.1 s, same page, video paused; another service closes it.
- [ ] Up to 3: a fourth service closes the least recently used awake one.
- [ ] A hidden service starts no sound by itself and its page script is not asked.
- [ ] Switching to Off and "Reset all data" close every awake service.
- [ ] Own pages behave like services; nothing is preloaded at start.
- [ ] RAM and CPU with one and three awake services measured hidden; the help text names
      the RAM range.

## Tests first
- Pure rules (Rust): which webview a tile shows, creates or pushes out per setting.
- Settings migration: missing field → Off.
- Hidden app tests with local pages: return without a new request, eviction order,
  Off closes, reset closes, a page that plays while hidden is paused again.

## Checks
- `npm run check`, all hidden app tests, `npm run measure` (idle with Off, RAM with
  awake services) after the yes.

## Resume here
Planned. Starts after of-01 is done and the advisor checked the design.
