---
type: decision
area: ui
tags: [motion, settings, resources]
status: active
created: 2026-11-22
updated: 2026-11-22
source: visual plan "Kachel-Animationen abschalten", rounds 0–1, approved 2026-11-22
---

# One switch turns all of floawty's animations off

Amends [[tiles-tilt-with-light]] and lifts gl-03's non-goal "settings for the effect".

## Context
After the first hover the tilt keeps memory until floawty ends, also while watching.
Invisible WebView2 probe, five starts each, 480 × 270: untouched 211 MB, glow without
motion 228, no effect at all 223, the hover before the tilt 243, full effect 257.
Reloading the page gave nothing back (260–264). The app measured 267.2 MB after
hovering against 235.2 before the tilt, one start each.

## Decision
- A setting `animations`, on by default, stored in settings.json (version stays 1;
  missing reads as on), part of the preferences. A switch in General below the theme.
- Off means what reduced motion in Windows means for all of floawty's own pages: no
  tilt, floating logo, moving light, fades or bar animation. The glow stays.
- It applies at once. The memory is lower from the next start, which the note under
  the switch says; floawty asks for no restart.
- Windows' reduced motion wins when the switch is on.
- "Reset all data" turns it on again. The settings export takes it along (rel-05).
- The tilt stays the default, which answers open question 10.

## Alternatives
- Only the Windows setting, named in a hint – turns animations off for all of Windows.
- The glow alone for everyone – drops the tilt the maintainer chose.
- Switching off only the tiles' effects – narrower name, saving not measured.
- Offering a restart – a question for about 30 MB.
- No effect at all when off – 5 MB less, and the tiles look dead.

## Consequences
- Every new animation obeys both the media query and `:root[data-still]`.
- The key stays a boolean: a value of another type resets an older build's whole
  settings without a copy (`persistence.rs` keeps only broken JSON aside; rel-05 fixes
  that). A further level gets its own key.
- An older build ignores the field and drops it on its next save.
