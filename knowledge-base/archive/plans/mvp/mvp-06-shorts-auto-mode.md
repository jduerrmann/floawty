---
type: plan
tags: [package, mvp, shorts, youtube]
status: done
created: 2026-11-17
updated: 2026-11-18
source: conversation; visual plan "mvp-06 Shorts-Auto-Modus" (.claude/plans/mvp-06-shorts.md), approved 2026-11-17
---

# mvp-06 – YouTube Shorts auto mode

Plan: [[plan-mvp]] · Decision: [[page-scripts-polled-on-title-change]]

## Outcome

With auto mode on, every Short (and every ad between them) plays once in full, then
stands on its first frame for the configured pause and YouTube's own "next" control
moves on. The floaty view turns 9:16 while Shorts play; hovering holds the automatic.

## Scope

- Owns: `src/services/youtube/` (state machine `shorts.ts`, page script `page.ts`,
  `selectors.ts`), page-script build, `src-tauri/src/page.rs`, portrait geometry,
  settings `shorts.holdOnHover`, `shorts.portraitSize`, `floatyPortrait`, the warn dot.
- Non-goals: liking, subscribing, commenting; skipping, shortening or detecting ads for
  any behavior (maintainer asked; rejected by core principle 7).
- Read first: AGENTS.md rules 7 and 9, [[page-scripts-polled-on-title-change]],
  [[tech-services]], [[tech-window]], [[engineering-standards]] §1–2, §7–8.

## Acceptance criteria

- [x] A Short's end is its jump back to the start (loop) or `ended`; a run completes once.
- [x] Moves on by clicking `#navigation-button-down button`, never by keys or URLs.
- [x] Pause (default 1 s) on the first frame; hover holds (setting, default on); leaving
      advances at the end of the current run; click-through never holds.
- [x] Ads play once in full, in the same player, and are never cut short.
- [x] Floaty view turns 9:16 on every Short (auto on or off), snapped corner or centre
      kept; back to 16:9 after; window mode never turns. Portrait size per setting:
      `rotated` (default) or `separate`.
- [x] A missing control leaves the normal page, a warn dot on ▶ and one log line without URL.
- [x] Service pages get no IPC; floawty asks `__floawty.sync` on title change, page load,
      setting or hover change, and once 3 s after a title change.
- [x] Right after opening, a blocked advance waits for the user's first click in the page.

## Tests first

- Vitest: state machine (loop end, ended, pause, hover hold, blocked, manual swipe).
- Cargo: settings fields, `geometry::turn`, `mode::floaty_size` / `remember_turned`.
- Playwright (Edge, no download) on hand-written fixtures in `test/fixtures/youtube/`:
  advance once per run, ad overlay runs once, missing control → problem, top frame only.
- Live: Claude without sign-in (ads); maintainer 10 Shorts with Premium.

## Implementation constraints (advisor)

Script only in the top frame on youtube.com hosts; chosen by validated id from
`dist/page/<id>.js` via the asset resolver; no `@tauri-apps` imports in page scripts.
`eval_with_callback` answers `""` on exceptions, never awaits promises, may never
answer: tag answers with an open generation, hand off before window calls, cap length,
closed serde enums, fixed log texts once per code. No document-wide MutationObserver.

## Evidence

- Checks: `npm run verify` – 65 Vitest, 82 cargo, 33 Playwright (16 app incl.
  `tests/shorts.spec.ts`, 17 adapter in Edge), clippy, build.
- Live (Claude, fresh profile, no sign-in, 2026-11-17): first run found YouTube calls
  `play()` at every loop and undid the pause, so nothing advanced; fixed (pause waits
  for `seeked`, red/green adapter test). Then 3 long Shorts (119/37/168 s) each ran
  once and advanced; 10 Shorts with 2 ads (15 s, 20 s): ads ran once in full, untouched;
  overlay 270 × 480, no warn dot.
- Resources (60 s, `spikes/measure`): Shorts without script 598 MB / 0.29 % CPU
  median; with auto mode 639 MB / 0.42 %; hidden afterwards 641 MB / 0.06 %. Within
  [[stack-by-spike]] budgets.
- Delegated: state machine, portrait geometry/settings, page script + adapter tests,
  review fixes in the page script – `coder`; lead reviewed each diff and ran checks.
- Independent review (`advisor`): no security finding; 8 should-fix items (inactive
  automatic, exact size restore + min width, main-thread serialisation, one log line,
  sub-2 s media, stale `seeked`, missing app test, resources) – all fixed; two
  re-checks found residuals (Short starting while hidden, size after moving the
  upright view, log test, fixed sleeps), all fixed; nit `floatyPortrait` full Rect kept
  on purpose. Final `npm run verify`: 67 Vitest, 82 cargo, 33 Playwright.
- Maintainer live test (signed in, Premium, 2026-11-18): passed.

## Resume here

Done on branch `feat/mvp-06-shorts-auto-mode`; the maintainer's live test with Premium
passed on 2026-11-18.
Follow-up after the commit (own change, maintainer 2026-11-17): a "YouTube Shorts" tile
that opens youtube.com/shorts with its own symbol and turns auto mode on when opened
through it; the YouTube tile stays as it is.
