---
type: plan
tags: [package, mvp, ui, i18n, hotkeys]
status: done
created: 2026-11-17
updated: 2026-11-17
source: conversation
---

# mvp-05 – Hover bar, settings, English and German

Plan: [[plan-mvp]] · Current state: [[tech-bar-and-settings]]

## Outcome

The bar appears over the video on hover and controls everything; the settings panel
changes hotkeys, language, Shorts pause and update check; all text exists in English
and German.

## Acceptance criteria

- [x] Bar fades in after 300 ms hover, over the video, transparent around its
      controls: tiles (◀), opacity, click-through, Shorts auto (YouTube only), ⧉,
      settings, close. Transparency works over the service webview; **no strip
      fallback needed**. Hover by a 100 ms cursor look ([[bar-hover-by-cursor-look]]).
- [x] Settings open inside the overlay and pause the video: language, hotkeys
      (record a new combination, conflict shown), Shorts pause, update check (off by
      default, stored only), "Reset all data" (wipe at restart).
- [x] A changed hotkey takes effect at once and survives a restart.
- [x] One i18n file; English typed as the source, German complete; no text in
      components.
- [x] Bar and settings are keyboard-usable and have labels (F6 between bar and page).
- [x] Hotkeys are shown localized (German: Strg+Alt+Umschalt), also in the
      click-through hint.
- [x] The click-through dot is visible while a service is open (it lives in the bar).
- [x] "◀" in the bar closes the service and shows the tiles (`close_service`).

## Evidence (2026-11-17)

- Tests first, red on their assertions, then green: `hotkeys.test.ts` (key press →
  hotkey, conflicts, localized display), Rust `settings` (Shorts pause
  range), `hover`, `reset` (temp dirs), `hotkeys` (action names). Written with the
  code, not red first: `resolveLanguage`/placeholder test, preference round trip,
  `bar::wanted`.
- `npm run verify` green: 29 Vitest, 54 Rust, 13 Playwright, build.
- Playwright (fresh profile, real cursor): bar shows on hover over a service and
  hides on leave; ◀ closes the service; opacity slider; click-through dot and
  localized hint over a service; language switch reloads both pages and is saved;
  hotkey recorded with a conflict shown and kept across a restart; reset wipes
  settings and profile and restarts. Two hover tests failed once each while the
  mouse was in use; afterwards 8 full runs and 5 bar-spec runs were green (the tests
  move the real cursor, so mouse use during a run breaks them).
- Check scripts on the release build: new hotkey Ctrl+Alt+Shift+K toggles
  click-through via real key presses at once, the old one no longer does; a playing
  video pauses when the settings open; bar over a reopened last service; dragging
  the window by the bar; F6 focuses the bar; window mode greys out opacity and
  click-through. Screenshots: tiles with pinned bar, hover at 50 % opacity, settings
  in German, click-through hint "Strg+Alt+Umschalt+K", window mode.
- Resources (`spikes/measure`): start 47 ms median, idle RAM 229 MB (budget 250),
  CPU 0.00 %; floawty.exe 0.000 % with a service open and the cursor away (first
  version 0.94 % with Tauri window queries in the loop – rewritten to Win32).

## Moved on

- RAM headroom is 21 MB with the bar as a third webview → check in mvp-08.
- Real services under the bar (YouTube, Netflix with DRM) → maintainer check, mvp-08.

## Resume here

Done. Next: [[mvp-06-shorts-auto-mode]].
