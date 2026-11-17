---
type: plan
tags: [package, mvp, window]
status: planned
created: 2026-11-17
updated: 2026-11-17
source: conversation
---

# mvp-03 – Window mode ↔ floaty view

Plan: [[plan-mvp]]

## Outcome

One action switches between a normal window (for signing in and browsing) and the
floaty overlay; each mode keeps its own size and place.

## Scope

- Owns: mode switch in `src-tauri/src/window/`, mode in the settings file.
- Non-goals: the ⧉ button itself (bar, 05) – this package provides the command and
  the hotkey.
- Read first: [[mvp-scope-and-controls]], mvp-02 result.

## Acceptance criteria

- [ ] Window mode: frame and title bar, not always on top, 100 % opacity, click-through
      off, normal resizing.
- [ ] Floaty view: everything from mvp-02 (frameless, on top, last opacity).
- [ ] Each mode restores its own last geometry; the first window mode is centred,
      1280 × 720 or smaller to fit.
- [ ] Hotkey Ctrl+Alt+Shift+F and a command for the bar switch modes; the video keeps
      playing across the switch.
- [ ] floawty starts in the mode it was closed in.

## Tests first

- Rust unit tests: mode state machine (switch keeps both geometries), first window
  mode geometry on small screens.

## Checks

- `npm run verify`; manual: sign in to a service in window mode, switch to floaty.

## Resume here

Not started.
