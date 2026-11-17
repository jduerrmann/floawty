---
type: plan
tags: [package, mvp, ui, i18n, hotkeys]
status: planned
created: 2026-11-17
updated: 2026-11-17
source: conversation
---

# mvp-05 – Hover bar, settings, English and German

Plan: [[plan-mvp]]

## Outcome

The bar appears over the video on hover and controls everything; the settings panel
changes hotkeys, language, Shorts pause and update check; all text exists in English
and German.

## Scope

- Owns: bar webview (transparent, on top of the service), settings panel, `src/i18n`,
  hotkey registration from settings.
- Non-goals: Shorts logic (06), "video only" (07), the update check itself (phase 3).
- Read first: [[mvp-scope-and-controls]], [[overlay-controls]], AGENTS.md rule 13.

## Acceptance criteria

- [ ] Bar fades in after 300 ms hover, over the video, transparent around its
      controls: tiles, opacity, click-through, Shorts auto, ⧉ window mode, settings,
      close. Fallback if transparency fails: bar as a strip (record it).
- [ ] Settings open inside the overlay and pause the video: language, hotkeys
      (record a new combination, conflict shown), Shorts pause, update check (off by
      default), "Reset all data".
- [ ] A changed hotkey takes effect at once and survives a restart.
- [ ] One i18n file; English typed as the source, German complete; no text in
      components.
- [ ] Bar and settings are keyboard-usable and have labels.

## Tests first

- Vitest: hotkey parsing and conflict check, i18n completeness (every key in both
  languages), settings validation.

## Checks

- `npm run verify`; Playwright: bar appears on hover, settings change opacity and
  language.

## Resume here

Not started.
