---
type: note
area: process
tags: [rules, testing, code-quality, performance]
status: active
created: 2026-11-16
updated: 2026-11-22
source: conversation; adapted from configuratorCore, varchy and processRecorder standards
---

# Engineering standards

How code is written, tested and kept small in floawty. Root `AGENTS.md` points here;
the sections are numbered for stable references.

## 1. Test first

- Pure logic, adapter behavior and every bug fix start with a failing test:
  **red** (the test fails because the behavior is missing) → **green** (the smallest
  change that passes) → **refactor** (clean up while it stays green).
- The red run must fail for the right reason. A missing import, broken setup or
  malformed fixture is not a red phase; fix the setup first.
- Tests make agreed behavior executable; they never decide unclear behavior. If the
  expected behavior is unclear, ask (AGENTS.md rule 3).
- Exceptions, kept narrow and named in the report: spikes under `spikes/`,
  exploratory UI while the interaction is still being found, docs-only and trivial
  mechanical changes. An accepted UI flow gets its Playwright test before release.

## 2. Test levels

Use the cheapest level that proves the behavior.

| Level | What | Tool |
|---|---|---|
| Unit | geometry, snapping, opacity steps, settings + migration, hotkey mapping, Shorts state machine | test runner of the stack (e.g. Vitest) |
| Adapter | selectors and page scripts against small hand-written HTML fixtures in `test/fixtures/<service>/` | Playwright in plain Chromium |
| App | service picker, settings, hotkey actions, window behavior that can be asserted | Playwright (Electron `_electron` / Tauri via WebDriver) |
| Live | real sites, playback, DRM | manual or local script, on demand – never in CI, never with a real account in automation |

- Fixtures mimic only the DOM structure the adapter needs. Never commit saved pages,
  screenshots or content of the real services.
- One behavior per test, with a name that states it. No fixed sleeps; wait for
  observable conditions. No retries that hide flakiness (repeating a noisy RAM
  measurement, §7, is not a test retry).
- App runs by stage (AGENTS.md rule 10, [[app-runs-smallest-first]]), each its own
  command, so that each result is reported and a stop really stops:
  - first `npm run build` after the last code change (needs no mouse); the tests run
    whatever exe is in `src-tauri/target/release/`.
  - named specs: `npm run smoke -- on-top.spec.ts:82`.
  - the same on the last good build (copy its exe before rebuilding, or build its
    commit; never swap the exe in `target/`), from Git Bash so that the variable
    ends with the command:
    `FLOAWTY_TEST_EXE=<exe> npm run smoke -- on-top.spec.ts:82`.
  - all app tests: `npm run smoke` (about 2 minutes).
  - one measurement: `npm run measure -- -g "idle on the tiles"` (about 1.5 minutes,
    needs no mouse; the hover needs it for the first minute only).
  - on a quiet PC: no other test run or build at the same time.

## 3. Readable code

- Code reads top to bottom: descriptive names, one job per function, early returns
  instead of deep nesting, no clever one-liners, no magic numbers without a named
  constant.
- TypeScript `strict`. No `any` without a short reason next to it. Validate data at
  real boundaries (settings file, page bridge); trust it inside.
- Prefer plain functions and data over classes and patterns. No generic helpers,
  wrappers or layers for a single use.

## 4. Comments

- A comment explains a non-obvious **why** in one short sentence: a platform quirk, a
  site behavior, a deliberate limit. Expand only for a sourced workaround.
- Never restate what the code does. No multi-line essays, no file-header banners
  (one usage line on top of a module is fine), no commented-out code, no TODO
  without an entry in [[open-questions]] or a plan package.
- Module rationale belongs in a tech note, not in the code.

## 5. Size limits

Counted: non-blank, non-comment lines of handwritten source, tests included.

| Unit | Review trigger | Hard limit |
|---|---|---|
| File | > 200 lines | 400 – split by responsibility |
| Function | > 30 lines | 60 – split by responsibility |

At a trigger, check cohesion and nesting; size alone does not settle it. No
`part1/part2` files and no one-use pass-through wrappers to satisfy a count. ESLint
`max-lines` / `max-lines-per-function` enforce the hard limits from the first
scaffold.

## 6. Remove what is obsolete

When a change makes code, files, assets or dependencies obsolete, remove them in the
same task; git keeps history. A search without hits is not proof of non-use: check
registries, dynamic imports and build config. Never delete tests to hide a failure.
Never treat user settings or service sessions as disposable.

## 7. Resource budget

floawty runs next to other work on an ordinary PC.

- One active service at a time; switching unloads the previous one.
- Event-driven, not polling. Unavoidable polling uses the slowest interval that
  works and stops while the overlay is hidden or the video is paused.
- Idle (no video playing) means ~0 % CPU.
- Budgets ([[stack-by-spike]]), measured with `spikes/measure`:

  | Metric | Budget | Spike value |
  |---|---|---|
  | Download | ≤ 10 MiB | 4.2 MiB |
  | Start → visible window | ≤ 200 ms | 46 ms |
  | RAM idle | ≤ 260 MB ([[idle-budget-260]]) | 188 MB |
  | RAM YouTube 1080p | ≤ 850 MB | 682 MB |
  | CPU idle and hidden | ≈ 0 % | 0.00 % |

- Changes to window handling, page scripts or startup are measured once the code is
  final and compared with the last recorded values (app runs, asked for as AGENTS.md
  rule 10 says); a regression beyond budget blocks a merge.
- Idle RAM varies by 15–35 MB between starts. One value over budget is no verdict:
  measure idle twice more, the median of the three decides. The request for an idle
  measurement names these possible repeats (up to 4.5 minutes, no mouse).

## 8. Security baseline for web content

Tauri capabilities grant commands only to floawty's own UI; service pages get no
IPC access at all. Navigation restricted to the service's allowed domains, external
links in the default browser, no `eval` in floawty's UI, no remote code, strict CSP
for floawty's own UI that forbids framing it (`frame-ancestors 'none'`,
[[floawty-ui-never-framed]]). WebView2 starts with `--disable-background-networking`.
