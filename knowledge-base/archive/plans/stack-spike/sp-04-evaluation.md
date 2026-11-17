---
type: plan
tags: [package, spike, decision]
status: done
created: 2026-11-17
updated: 2026-11-17
source: conversation
---

# sp-04 – Evaluation and stack decision

Plan: [[plan-stack-spike]]

## Outcome

The maintainer decides the stack on a planning page with the measured numbers;
[[stack-by-spike]] is accepted with resource budgets, and the MVP plan is started.

## Scope

- Owns: [[stack-by-spike]] (Decision, Consequences), [[open-questions]] #1 and #2,
  [[engineering-standards]] §7 (budgets), AGENTS.md rule 7 (stack named),
  the new plan `plans/mvp/`.
- Non-goals: MVP implementation.
- Read first: both `RESULTS.md` files, [[drm-services-in-first-release]].

## Acceptance criteria

- [ ] Planning page (visual plan) shows both stacks side by side: playback table,
      bars for size, cold start, RAM idle/playing, CPU playing/hidden.
- [ ] The agreed rule is applied visibly: DRM + Google login as gate, then lighter wins.
- [ ] The maintainer decides which candidates (Apple TV+, Crunchyroll, RTL+) get
      tiles; [[drm-services-in-first-release]] and AGENTS.md rule 9 updated.
- [ ] Budgets set from the winner's numbers with headroom, written into
      [[stack-by-spike]] and [[engineering-standards]] §7.
- [ ] [[drm-in-desktop-webviews]] updated from "unverified" to the observed facts.
- [ ] MVP plan map with packages (window, hover bar, hotkeys, tiles, settings,
      YouTube) registered in [[active-plans]]; this plan archived.

## Checks

- Links and index reachability of all touched notes.

## Evidence (2026-11-17)

- Planning page "Auswertung Testprototyp" (`.claude/plans/stack-auswertung.md`),
  answered by the maintainer: Tauri confirmed, WebView2's Microsoft connection
  disclosed with a first-start notice, one shared profile in the MVP, every tested
  service gets a tile, budgets accepted, Windows only.
- Recorded in [[stack-by-spike]], [[webview2-diagnostics-disclosed]],
  [[shared-webview2-profile-in-mvp]], [[drm-services-in-first-release]],
  [[engineering-standards]] §7–8, AGENTS.md rules 2, 6–9, PRIVACY.md, README;
  results in [[stack-spike-results]]; [[drm-in-desktop-webviews]] updated.
- Not done here: the MVP plan map. It gets its own planning page (follow-up in
  [[active-plans]]).

## Resume here

Done.
