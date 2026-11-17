---
type: plan
tags: [package, mvp, scaffold]
status: ready
created: 2026-11-17
updated: 2026-11-17
source: conversation
---

# mvp-01 – App scaffold

Plan: [[plan-mvp]]

## Outcome

`npm run tauri dev` starts an empty floawty window, and `npm run verify` runs every
check the project requires.

## Scope

- Owns: `package.json`, `src-tauri/` (Cargo, config, capabilities, `main.rs`), `src/`
  (Vite + TS entry), `vite.config.ts`, `tsconfig.json`, ESLint/Prettier config,
  `tests/` (Playwright), `.github/` untouched (CI is phase 3).
- Non-goals: any overlay feature.
- Read first: [[stack-by-spike]], [[engineering-standards]] §1–5, AGENTS.md rules 5–7,
  `spike/sp-03-tauri` (`src-tauri/`, `tests/smoke.spec.js`) for working settings.
- Needs OK for dependencies: Tauri 2 (pinned minor), tauri-plugin-global-shortcut,
  Vite, TypeScript, Vitest, ESLint + typescript-eslint, Prettier, Playwright.

## Acceptance criteria

- [ ] Tauri pinned to one minor version (`~2.12`), WebView2 started with Tauri's
      defaults plus `--disable-background-networking`.
- [ ] TypeScript `strict`; ESLint with `max-lines` 400 and `max-lines-per-function` 60
      (non-blank, non-comment); Prettier.
- [ ] `npm run verify` runs: tsc, ESLint, Prettier check, Vitest, `cargo fmt --check`,
      `cargo clippy -D warnings`, `cargo test`, Playwright smoke test, build.
- [ ] Playwright smoke test connects over the WebView2 debug port and sees the
      window's page.
- [ ] The app logs its version and the WebView2 runtime version at start (local log).
- [ ] Capabilities: floawty's own UI only; no remote origin gets IPC.

## Tests first

- One Vitest and one `cargo test` example that fail first, to prove both runners
  report failures.

## Checks

- `npm run verify` green; release build starts; exe size noted (budget ≤ 10 MiB).

## Resume here

Not started. Next action: ask for the dependency OK, then create branch
`feat/mvp-01-scaffold` from `main`.
