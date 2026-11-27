---
type: plan
tags: [package]
status: done
created: 2026-11-26
updated: 2026-11-27
source: visual plan "Kacheln öffnen schneller", rounds 1–3
---

# of-01 – The click shows the opening

Plan: [[plan-open-faster]]

## Outcome
A tile shows within 100 ms that its service opens, the area never flashes white, and
the page takes over when its first document starts loading.

## Scope
- Owns: `src-tauri/src/service.rs`, `overlay.rs` (state field `opening`),
  `theme.rs` (ground colour), `src/opening.ts` (new), `src/tiles.ts`, `src/home.ts`,
  `src/main.ts`, `src/state.ts`, `src/tiles.css`, `src/i18n.ts`, `tests/opening.spec.ts`
  (new), `tests/measure/open-compare.spec.ts` (probe).
- Non-goals: keeping services awake (of-02), reusing webviews, preloading, anything
  service-specific.
- Read first: [[tech-services]], [[service-shows-when-page-starts]], `service.rs`.

## Acceptance criteria
- [x] A click marks the tile as opening in the click's own task (so the next frame
      shows it, well under 100 ms); the other tiles step back.
- [x] Further tile clicks while opening start nothing (one request to the page).
- [x] The service webview waits out of sight (full size, left of the window; at size 0
      WebView2 shows no page popups) until its first document starts loading
      (`PageLoadEvent::Started`), at the latest until loading ends, failure included.
- [x] The webview's background is floawty's ground colour for the effective theme until
      the first load ends, then white as before.
- [x] Opening the last service at start shows the same sign.
- [x] With animations off or reduced motion the sign does not move.
- [x] Page start and paints are not later than before (probe, hidden, after the yes).
- [x] Idle RAM on the tiles stays within budget.

## Tests first
- Vitest `src/opening.test.ts`: a click marks the tile until the shell reports; the
  shell's `opening` wins; a stale state without `opening` keeps the click's mark; a
  failed open clears it.
- Rust: ground colour matches `tokens.css`; `place` keeps an opening service left of the window.
- `tests/opening.spec.ts` (hidden, local page answering after 1.5 s): mark within
  100 ms, one request after a second click, mark gone and page full size after the
  answer; a page that drops the connection still ends the opening.

## Checks
- `npm run check`; `npm run build`; `npm run smoke:hidden -- opening`, then all hidden
  app tests; `npm run measure -- open-compare` and the idle budget after the yes.

## Evidence (2026-11-26)
- Red first: `tests/opening.spec.ts` 2/2 red on `d0bfdd7`, green after the change.
- `npm run check` green (181 Vitest, 163 adapter, 133 Rust in floawty, test-input green).
- All hidden app tests: 51/51 in five of six full runs on the final code; the sixth had
  `bar.spec.ts` "nine controls" red (bar 310 instead of 240 px), green 5/5 alone and in
  the other full runs, 2/2 green on `d0bfdd7`; cause not found, watched.
- Bug found by the app tests: a webview created at size 0 never shows page popups
  (`bar.spec.ts` suggestion list 3/3 red); a diagnostic build proved it, so the opening
  webview waits at full size left of the window.
- Measurement (maintainer's yes, hidden): start 257 ms (≤ 400), download 3.3 MiB, idle
  218.9 MB / 0 % (after hover 244.8, animations off 225.6), YouTube 1080p 719.2 MB /
  0.3 % at 61.4 fps, hidden 707.1 MB / 0 %: within budget.
- Probe after vs before (medians, ms; Chrome new tab in the same run in brackets): first
  paint 645 (571) vs 519 (456), largest paint 1317 (1400) vs 1079 (1244), load 1690
  (1409) vs 1207 (1227). Paints moved with Chrome (network).
- A/B probe (maintainer's yes), three hidden runs: this code (parked), the same without
  parking, and `d0bfdd7`. First visit, GPU on, ms: first paint 555 / 528 / 556, largest
  paint 1188 / 1156 / 1154, load 1604 / 1168 / 1278 (spread 1315–1620, 1159–1552,
  1275–1535); GPU off load 1542 / 1650 / 1567. Paints are the same; the load event lies
  within the run-to-run spread, the earlier gap was mostly drift between runs.
- Reviews: advisor (independent), 5 should-fix + 3 nits, all fixed (way out by back,
  white after load, `SWITCHING` lock, probe gated by `FLOAWTY_LIVE_PROBE`, restore and
  ground tests, ⋯ disabled while opening); re-review: nothing material, nits taken
  (park left, keyboard-proof ⋯, criterion wording).

## Resume here
Done. On `main` as the merge `2b9d006` of `d458780` (after rel-02), not pushed.
Follow-up outside this package: `bar.spec.ts` "nine controls" is flaky on `main`
(reported by the page fullscreen session, 3 of 8 runs); `d0bfdd7` was 2/2 green here.
