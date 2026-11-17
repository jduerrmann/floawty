---
type: plan
tags: [package, mvp, scaffold]
status: done
created: 2026-11-17
updated: 2026-11-17
source: conversation
---

# mvp-01 – App scaffold

Plan: [[plan-mvp]]

## Outcome

`npm run dev` starts floawty, and `npm run verify` runs every check the project
requires.

## Acceptance criteria

- [x] Tauri pinned (`tauri ~2.12`, `tauri-build ~2.7`, `@tauri-apps/cli ~2.12.5`),
      WebView2 started with Tauri's defaults plus `--disable-background-networking`
      (`tauri.conf.json`, window `additionalBrowserArgs`).
- [x] TypeScript `strict` (TS 6.0 – typescript-eslint supports < 6.1); ESLint with
      `max-lines` 400 / `max-lines-per-function` 60 (non-blank, non-comment); Prettier.
- [x] `npm run verify`: tsc, ESLint, Prettier check, Vitest, `cargo fmt --check`,
      `cargo clippy -D warnings`, `cargo test`, release build, Playwright smoke test.
- [x] Playwright smoke test connects over the WebView2 debug port and checks the
      page shows `floawty <version> · WebView2 <version>`.
- [x] Startup line with app and WebView2 version in
      `%APPDATA%\floawty\logs\floawty.log`.
- [x] Capability `main` grants `core:default` to the main window only; no remote origin.

## Evidence (2026-11-17)

- Tests first: `startup_log` (3 cargo tests) and `aboutText` (2 Vitest tests) failed on
  their assertions first, then passed.
- `npm run verify` green, exit 0. Release exe **2.99 MiB** (budget ≤ 10 MiB).
- Log line written: `… floawty 0.1.0 started, WebView2 157.0.4341.46`.
- Added `@types/node` (types for the Playwright test) beyond the approved list.

## Resume here

Done. Next: [[mvp-02-overlay-window]].
