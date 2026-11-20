---
type: decision
area: window
tags: [overlay, hotkeys, bar, settings]
status: active
created: 2026-11-20
updated: 2026-11-20
source: visual plan "Immer im Vordergrund – Schalter", round 1, answered 2026-11-20
---

# Always on top is a stored switch of the floaty view

## Context
The floaty view always stays above every window ([[mvp-scope-and-controls]]). Sometimes
that gets in the way, and the only ways out were shrinking, hiding or window mode.
Planning page `.claude/plans/always-on-top.md`.

## Decision
- A bar button 🖈 (after click-through) and a hotkey (default Ctrl+Alt+Shift+T,
  configurable) switch always on top off and on. Tooltip "Always on top" /
  „Immer im Vordergrund", pressed = on; no extra marker while off.
- **Stored** as `alwaysOnTop` in settings.json (default `true`); a restart keeps it.
- **Floaty view only.** Window mode stays a normal window; there the button is
  disabled and the hotkey does nothing.
- **Click-through keeps floawty on top** while it is on; afterwards the switch applies
  again. Clicking through onto a covered video is pointless, and the switch should
  never flip silently.
- **Show/hide hotkey:** with the switch off in the floaty view and floawty not the
  active window, it brings floawty to the front instead of hiding it; a second press
  hides.

## Alternatives
- Off only until floawty closes, like click-through – rejected by the maintainer: the
  choice should stay; the risk of an apparently missing window is covered by the
  taskbar, Alt+Tab and the show/hide hotkey.
- Click-through independent of the switch – rejected: the first click through would
  bring the window behind to the front and cover floawty.
- Click-through switching it back on for good – rejected: changes the user's choice.
- Show/hide raising only when another window really covers floawty – rejected: needs
  a z-order walk that cannot see through other apps' transparent or cloaked windows.

## Consequences
- A floaty view that is visible but not active needs two presses of show/hide to hide;
  a minimized one is restored and brought to the front.
- The hotkey also works while click-through is on: it saves the switch, which shows
  once click-through ends (the bar shows only the dot meanwhile).
- Someone who already gave Ctrl+Alt+Shift+T to another action keeps it there; the new
  action is then only logged as not registered until they pick another key.
- The settings export (rel-05) decides whether `alwaysOnTop` is on its allow-list.
