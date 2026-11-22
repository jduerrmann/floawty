---
type: tech
area: ui
tags: [bar, settings, i18n, hotkeys, reset]
status: active
created: 2026-11-17
updated: 2026-11-22
source: mvp-05 implementation
---

# Bar, settings panel and languages

The bar is a transparent webview (label `bar`, `src/bar.html`) on top of the main
window: a 40 px strip with a pill of controls. The settings panel lives in the main
page (`src/index.html`) under the bar. Both pages follow one state from the shell.

## Invariants

- **Bar visibility:** pinned on the tiles, while the settings are open and in window
  mode; over a service in the floaty view only on hover (300 ms, hidden after 3 s of a
  resting cursor except over the bar, hidden when the cursor leaves; a page's pop-up
  owned by floawty's window, such as a suggestion list, counts as inside); always shown while click-through is on,
  then with the dot and hint only. Hover detection: [[bar-hover-by-cursor-look]].
- **Bar placement** (`bar::layout`, [[bar-leaves-the-page-clickable]]): in window mode a
  full-width strip with a solid background above the page, the service starting 40 px
  lower; over a service in the floaty view only as wide as the controls (natural width
  reported by the page, `set_bar_width`, plus 8 px), centred, so the page beside it
  stays clickable; otherwise the full width. `bar::fit` places bar and service after
  every resize and state change; the service webview has no `auto_resize`.
- The bar must stay above the service webview: WebView2 puts every new child window
  on top, so `service::open` calls `bar::raise` (Win32 `SetWindowPos`).
- The cursor is watched while a service is visible and clickable, also in window mode
  (the page's Shorts hold), but the bar follows it only in the floaty view.
- When the hover hides the bar and the keyboard is in the bar (asked before hiding), it
  goes back to the service; never from the page (that would close its pop-ups) or from
  another app. A pointer click on a bar button also hands the keyboard to the page
  (`move_focus`); keyboard users stay in the bar.
- The controls turn compact (20 px buttons, no gap) only when they overflow the bar;
  their natural width is measured under `.measuring`, free of the current width.
- A hidden webview keeps `document.visibilityState` "visible"; the bar learns its
  visibility from the event `bar-visible` (also `body[data-visible]` for tests).
- **Look** ([[glass-design-follows-windows-theme]]): bar, settings and tiles use the
  `light-dark()` tokens of `src/tokens.css` and follow Windows. Over a visible service
  (`serviceId` set, settings closed) `bar.ts` sets `body.over-service`, which pins
  `color-scheme: dark` in CSS; never Tauri's theme API (it would reach the shared
  WebView2 profile). The pill's shadow stays inside the 4 px the shell adds per side.
- **Bar icons** are SVG files in `src/assets/icons/` drawn as CSS masks over
  `currentcolor` (the CSP has no `data:`); pressed = accent tint, the problem dot is
  `::after`. Accessible names come from `aria-label`, the buttons have no text.
- **Settings page:** cards General (language, theme, animations, update check, graphics acceleration),
  Hotkeys, Shorts and TikTok, Data (reset), then the trademark line for the logos
  ([[redrawn-service-logos]]). rel-03's update button joins General, rel-05's export
  and import join Data. On/off settings are checkboxes with `role="switch"` (Space
  toggles, `change` events as before). Hotkeys show one `<kbd>` chip per key
  (`hotkeyParts`); the button's accessible name is "action: Strg+Alt+…". "Delete
  everything" is the only red control (`--danger`).
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
- Auto-mode settings (section "Shorts and TikTok"): pause 0–10 s, "hold while the mouse
  is over floawty" (default on), size while a short video plays (`rotated` default or `separate`, [[tech-window]]).
- The update check is stored only (off by default); nothing talks to GitHub yet.
- "Use graphics acceleration" (default on): turning it off or on asks "Restart floawty
  now?" in place; Cancel puts the box back, Restart saves and restarts
  (`set_graphics_acceleration`), because WebView2 takes its arguments only at start.
  Off starts every webview with `--disable-gpu`: no PlayReady, more CPU (mvp-11).

- **Theme** ([[floawty-theme-choice]]): `theme` (system, light, dark) travels with the
  preferences. `theme::startup_script` sets `data-theme` on home and bar before the
  first paint (the root element does not exist yet when it runs, hence the observer);
  later changes come with the state, with a session copy for reloads. `tokens.css`
  turns it into `color-scheme`; no colour may ask `prefers-color-scheme`.
- **Animations** ([[animations-switch]]): `animations` (default on) travels with the
  preferences; `state.ts` puts `data-still` on the root of home and bar before they
  render and on every state. CSS gives it what `prefers-reduced-motion: reduce` gets,
  so a new animation needs both rules. No startup script: tiles and hover need the state
  first, and a bar fade already running stops when it arrives.
- **Title bar:** `theme::apply` sets DWM's dark attribute on the main window and a
  subclass sets a chosen one again after every `WM_SETTINGCHANGE`, which tao answers
  with Windows' colour. It repaints only a decorated window. No Tauri calls in the
  subclass.

## Structure

| File | Role | Tests |
|---|---|---|
| `src-tauri/src/bar.rs` | create, place bar and service (`layout`), raise, show/hide, hover watcher | unit (`wanted`, `layout`), Playwright |
| `src-tauri/src/hover.rs` | when the bar shows: delay, leave, idle | unit |
| `src-tauri/src/theme.rs` | startup script, title bar colour | cargo, `tests/theme.spec.ts` |
| `src-tauri/src/reset.rs` | reset request and wipe at start | unit (temp dirs), Playwright |
| `src-tauri/src/hotkeys.rs` | register, change one, pause all; action names | unit |
| `src-tauri/src/commands.rs` | `toggle_click_through`, `toggle_always_on_top`, `toggle_video_only`, `toggle_zoom`, `set_bar_width`, `set_settings_open`, `set_preferences`, `set_graphics_acceleration` (save, restart), `set_hotkey`, `set_hotkeys_paused`, `move_focus` (F6), `reset_all_data`, `quit` | Playwright |
| `src/state.ts` | `OverlayState`, start a page in its language, reload on change, `withShortsAuto` | Vitest |
| `src/bar.ts`, `src/bar.css`, `src/click-through.ts` | controls, dot and hint | Playwright |
| `src/settings-panel.ts`, `src/hotkey-list.ts`, `src/settings.css` | glass cards, preferences, restart and reset confirms, hotkey recording and chips | Playwright |
| `src/hotkeys.ts` | key press → hotkey, conflicts, localized display (`hotkeyParts`, `formatHotkey`) | Vitest |
| `src/i18n.ts` | all texts, `resolveLanguage` | Vitest |

Bar controls (own icons; named here by glyph): ◀ back to the tiles (only with a service), opacity 10–100 %, ⇄
click-through, 🖈 always on top (pressed = on; [[always-on-top-switch]]), ▶ auto mode (only for services whose manifest sets
`shortsAutoMode`; an amber dot and another tooltip when the page script reports
missing controls, [[tech-shorts]]), ▣ video only (only for manifests with `videoOnly`;
the dot when the player is missing, [[tech-video-only]]), ⤢ zoom to fill (every open
service; one saved `zoom` switch, pushed to the page as `__floawtyZoom(on)` and only on in
the floaty view), ⧉ window mode, ⚙ settings, ✕ close floawty. Opacity,
click-through and 🖈 are disabled in window mode. The grip ⠿ at the left of the controls drags
the window (the bar may be no wider than the controls); in window mode the title bar too. F6 moves between the bar and the page below; Esc leaves the bar and closes
the settings.

`OverlayState` (command `overlay_state`, event `overlay-state`): mode, opacity,
clickThrough, serviceId, settingsOpen, hotkeys, language, theme, animations, shorts (auto, pauseSeconds,
holdOnHover, portraitSize), updateCheck, graphicsAcceleration, videoOnly, zoom,
alwaysOnTop, pageProblems.

## Working on X → read Y

- New bar control → `src/bar.html`, `bar.ts`, texts in `i18n.ts`, a Playwright test.
- New preference → `settings.rs` (`Preferences`, default and parse test), `state.ts`,
  `settings-panel.ts`.
- Hover timing → `hover.rs` tests first.
