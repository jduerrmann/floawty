---
type: plan
tags: [package, glass, window, resources]
status: archived
created: 2026-11-22
updated: 2026-11-22
source: visual plan "Hell/Dunkel und Hover-Effekt", round 3, approved by the maintainer 2026-11-22
---

# gl-04 – The home page sleeps under a service

Plan: [[plan-glass]]

**Dropped by the maintainer 2026-11-22, never built:** [[home-stays-awake-under-a-service]].

## Outcome
While a service is loaded and visible, the home webview is hidden, and every way
back shows it at once.

## Scope
- `src-tauri/src/home.rs` (new), `service.rs` (open, loaded, close, cover),
  `commands.rs`, `main.rs`, app tests and measurement.
- Non-goals: `TrySuspend`, memory target levels, unloading, changes to services.
- Read first: [[home-stays-awake-under-a-service]], [[tech-services]], `service.rs`,
  `bar.rs` (z-order, focus).

## Acceptance criteria
- [ ] Home hides only after the service's page finished loading and only while a
      service is open and the settings are closed; a late load event of a closed
      service never hides it.
- [ ] Settings, ◀, a failed open and switching services show it before it is needed;
      no blank frame, back on the tiles in under 100 ms.
- [ ] Keyboard focus stays with the service on sleeping and goes to home on waking;
      F6, hotkeys and Esc work as before.
- [ ] Resizing, window mode, Shorts turning, hide/show, minimize/restore and a
      restart into a service leave the right page visible and correctly sized, with
      the bar on top.
- [ ] State changes reach the sleeping page (language, theme).
- [ ] YouTube 1080p RAM and CPU measured against gl-02 (725 MB, 0.33 %).

## Tests first
- Cargo: `sleeps(open, loaded, settings_open)` for all cases.
- App: the home window is hidden after loading, shown with settings and after ◀;
      the service keeps the keyboard; time back to the tiles.

## Checks
- `npm run check`; independent review; app run (all app specs, since every one that
  opens a service touches this) and `npm run measure` after the maintainer's yes.

## Evidence so far
- Plan check (advisor, 2026-11-22): go with changes, after testing the premise. The
  changes (open from the webview, a generation for `loaded`, state before sync,
  focus after hiding, blank-frame fallback, Win32 visibility in tests) apply if built.
- Premise on real WebView2 (throwaway probe with wry 0.57.2 and tao 0.37.2 in a
  never-shown window, 480 × 270, after hovering every tile): hidden reads `hidden`
  and is back in 13–40 ms, but saves **nothing after 8 s and a median 3 MB after
  90 s** (five pairs; one outlier −42 MB). `MemoryUsageTargetLevel` low lowers only
  the working set (−25 MB at 8 s), not private bytes, and needs a new direct
  dependency. The approved 5–22 MB saving came from headless Edge and does not hold.

## Resume here
Dropped 2026-11-22 after the premise failed; nothing of it is in the code. No next action.
