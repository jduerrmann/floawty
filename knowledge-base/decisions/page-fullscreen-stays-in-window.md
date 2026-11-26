---
type: decision
area: window
tags: [fullscreen, settings, webview2, dependency]
status: active
created: 2026-11-26
updated: 2026-11-26
source: visual plan "Vollbild im Fenster", round 1, answered 2026-11-26; spike 2026-11-26
---

# A page's fullscreen stays in floawty's window, by a switch that is on by default

## Context
A page's fullscreen button made the whole floawty window fill the screen: the overlay
was gone, and pages without "video only" had no other way to a large video. Tauri
registers a `ContainsFullScreenElementChanged` handler on every webview that always sets
the window fullscreen; it has no switch and keeps its token to itself. Planning page
`.claude/plans/vollbild-im-fenster.md`.

## Decision
- One switch in Settings → General, "Page fullscreen stays in the window" /
  „Vollbild der Seiten bleibt im Fenster", stored as `fullscreenInWindow`, **on by
  default**, the same in the floaty view and window mode (there below the title bar
  and the bar strip). Off gives the whole screen as before. No bar button, no hotkey.
- floawty takes the event over on the service webview: it registers its own handler
  and removes the tokens below its own (at most 64), which takes Tauri's away. On, the
  window never changes and WebView2 lays the element over the service webview.
- `webview2-com` becomes a direct dependency (maintainer's OK, 2026-11-26): MIT, the
  same version Tauri already brings, so no new code; a Tauri upgrade that moves it
  fails at compile time.
- Safety net: if Tauri's handler survives (WebView2 hands out tokens differently one
  day), floawty undoes the window fullscreen on the first `Resized` and logs it. The
  page then works, with the short flash below.

## Alternatives
- Undo Tauri's window fullscreen on `Resized` alone – rejected: the window stood about
  6 ms at screen size; the maintainer saw the flash. It stays only as the safety net.
- Subclass the window and swallow the size and style change – rejected: tao would
  believe it is fullscreen while floawty sets size and decorations itself, and there is
  no signal before tao acts without the handler anyway.
- Patch Tauri or wait for an option upstream – rejected: Tauri is pinned, nothing
  upstream exists.
- A page script that fakes fullscreen with styles – rejected: changes every page's
  player code and breaks with each site.
- Real fullscreen in window mode, the switch only in the floaty view – rejected by the
  maintainer: one rule for the button.

- With the switch off, the mode switch (button, hotkey) and turning for a Short do
  nothing while a page fills the screen: both would store or resize the screen-sized
  window (found in review; lead's choice, simplest and reversible).

## Consequences
Removing tokens relies on WebView2 counting them up, which is undocumented; the
hidden app test `page-fullscreen.spec.ts` fails when the safety net fires. CI runs no
app tests, so only local runs catch it. Updates [[video-only-lays-player-over-page]]'s
note that a page's fullscreen takes the whole screen: only with the switch off.
