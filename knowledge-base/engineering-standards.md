---
type: note
area: process
tags: [rules, testing, code-quality, performance]
status: active
created: 2026-11-16
updated: 2026-11-16
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
  observable conditions. No retries that hide flakiness.

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
- Concrete budgets (download size, cold start, RAM idle, RAM while playing) are set
  in [[stack-by-spike]] after the spike. Changes to window handling, page scripts or
  startup are measured before and after; a regression beyond budget blocks a merge.

## 8. Security baseline for web content

Context isolation on, Node integration off, sandbox on, a minimal typed bridge,
navigation restricted to the service's allowed domains, external links in the default
browser, no `eval`, no remote code, strict CSP for floawty's own UI.
