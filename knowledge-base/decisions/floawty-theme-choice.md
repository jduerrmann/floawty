---
type: decision
area: ui
tags: [theme, settings, title-bar, privacy]
status: active
created: 2026-11-22
updated: 2026-11-22
source: visual plan "Hell/Dunkel und Hover-Effekt", rounds 1–3, 2026-11-22
---

# floawty has its own light or dark choice, following Windows by default

## Context
[[glass-design-follows-windows-theme]] made floawty follow Windows only. The
maintainer wants light or dark for floawty without switching all of Windows.

## Decision
- A setting `theme`: `system` (default), `light` or `dark`, stored in settings.json
  (version stays 1; missing or unknown reads as `system`), part of the preferences.
  Three segments in General, below the language.
- It colours floawty's own pages (tiles, settings, bar) and the title bar of window
  mode. The bar stays dark over a visible service.
- Services, the sign-in window and the tooltips Windows draws keep following Windows.
- The pages pin `color-scheme` on the root element (`data-theme`), set by an
  initialization script before the first paint.
- The title bar is set with `DwmSetWindowAttribute` on floawty's window only. tao
  resets it on every `WM_SETTINGCHANGE`, so floawty sets it again after that message.
- Never Tauri's theme API: a window theme raises `ThemeChanged`, and Tauri then sets
  each webview's theme, which is a setting of the WebView2 profile all services share.

## Alternatives
- A two-state switch – cannot express "like Windows".
- A title bar like Windows, without Rust code – rejected: half dark in window mode.
- Tauri's theme API – recolours the services.

## Consequences
- Amends [[glass-design-follows-windows-theme]]: "follows Windows, no Rust code" and
  the rejection of "dark only" now describe the default, not the only choice.
- CSS never asks `prefers-color-scheme` for a colour; only `light-dark()` follows the
  choice.
- An older build ignores the field and drops it on its next save.
