---
type: tech
area: ui
tags: [bar, settings, i18n, hotkeys, reset]
status: active
created: 2026-11-17
updated: 2026-11-18
source: mvp-05 implementation
---

# Bar, settings panel and languages

The bar is a transparent webview (label `bar`, `src/bar.html`) on top of the main
window: a 40 px strip with a pill of controls. The settings panel lives in the main
page (`src/index.html`) under the bar. Both pages follow one state from the shell.

## Invariants

- **Bar visibility:** pinned on the tiles and while the settings are open; over a
  service only on hover (300 ms, hidden after 3 s of a resting cursor except over
  the bar, hidden when the cursor leaves); always shown while click-through is on,
  then with the dot and hint only. Hover detection: [[bar-hover-by-cursor-look]].
- The bar must stay above the service webview: WebView2 puts every new child window
  on top, so `service::open` calls `bar::raise` (Win32 `SetWindowPos`).
- When the hover hides the bar and floawty is the foreground window, the keyboard
  goes back to the service, never away from another app.
- A hidden webview keeps `document.visibilityState` "visible"; the bar learns its
  visibility from the event `bar-visible` (also `body[data-visible]` for tests).
- **Settings open** (`set_settings_open`): the service video pauses, its webview is
  hidden, the main page shows the panel and gets the keyboard. Closing shows the
  service again; the video stays paused.
- **Hotkeys** are checked in the UI (needs Ctrl, Alt or Win; supported keys only;
  conflicts with floawty's own). While one is recorded, all global hotkeys are off
  (`set_hotkeys_paused`), so their keys reach the page. `set_hotkey` registers the
  new one at once and keeps the old one if another app holds the new one.
- **Reset all data** writes `reset-requested` and restarts; the next start deletes
  floawty's folder and the WebView2 profile **before** the main window exists
  (`tauri.conf.json` `create: false`, created in `setup`). A locked profile keeps
  the request for the next start.
- **Languages:** every visible text is in `src/i18n.ts` (English typed as the source,
  German complete, same placeholders – Vitest). `system` follows Windows. Changing
  the language reloads both pages. Hotkeys are shown localized (Strg, Umschalt,
  Leertaste, arrows) everywhere, also in the click-through hint.
- Shorts settings: pause 0–10 s, "hold while the mouse is over floawty" (default on),
  size while a Short plays (`rotated` default or `separate`, [[tech-window]]).
- The update check is stored only (off by default); nothing talks to GitHub yet.

## Structure

| File | Role | Tests |
|---|---|---|
| `src-tauri/src/bar.rs` | create, fit to the width, raise, show/hide, hover watcher | unit (`wanted`), Playwright |
| `src-tauri/src/hover.rs` | when the bar shows: delay, leave, idle | unit |
| `src-tauri/src/reset.rs` | reset request and wipe at start | unit (temp dirs), Playwright |
| `src-tauri/src/hotkeys.rs` | register, change one, pause all; action names | unit |
| `src-tauri/src/commands.rs` | `toggle_click_through`, `toggle_video_only`, `set_settings_open`, `set_preferences`, `set_hotkey`, `set_hotkeys_paused`, `move_focus` (F6), `reset_all_data`, `quit` | Playwright |
| `src/state.ts` | `OverlayState`, start a page in its language, reload on change, `withShortsAuto` | Vitest |
| `src/bar.ts`, `src/bar.css`, `src/click-through.ts` | controls, dot and hint | Playwright |
| `src/settings-panel.ts`, `src/hotkey-list.ts` | panel, preferences, reset confirm, hotkey recording | Playwright |
| `src/hotkeys.ts` | key press → hotkey, conflicts, localized display | Vitest |
| `src/i18n.ts` | all texts, `resolveLanguage` | Vitest |

Bar controls: ◀ back to the tiles (only with a service), opacity 10–100 %, ⇄
click-through, ▶ Shorts auto mode (only for services whose manifest sets
`shortsAutoMode`; an amber dot and another tooltip when the page script reports
missing controls, [[tech-shorts]]), ▣ video only (only for manifests with `videoOnly`;
the dot when the player is missing, [[tech-video-only]]), ⧉ window mode, ⚙ settings, ✕ close floawty. Opacity and
click-through are disabled in window mode. The empty parts of the strip drag the
window. F6 moves between the bar and the page below; Esc leaves the bar and closes
the settings.

`OverlayState` (command `overlay_state`, event `overlay-state`): mode, opacity,
clickThrough, serviceId, settingsOpen, hotkeys, language, shorts (auto, pauseSeconds,
holdOnHover, portraitSize), updateCheck, videoOnly, pageProblems.

## Working on X → read Y

- New bar control → `src/bar.html`, `bar.ts`, texts in `i18n.ts`, a Playwright test.
- New preference → `settings.rs` (`Preferences`, default and parse test), `state.ts`,
  `settings-panel.ts`.
- Hover timing → `hover.rs` tests first.
