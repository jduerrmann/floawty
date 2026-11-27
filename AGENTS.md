# floawty – Project rules

Canonical working rules for every contributor and coding agent in this repository.
`CLAUDE.md` imports this file; edit shared rules only here. Rule numbers stay stable.

Wording: plain imperatives are binding. `prefer`, `normally` and `by default` mark
defaults; deviate only with a stated reason. `never` marks an invariant.

floawty is a small, always-on-top overlay window for watching videos from common
streaming services (YouTube, TikTok, Netflix, Prime Video, Disney+, Twitch, …) while
doing something else. Size, opacity and position are adjustable; for YouTube Shorts and
TikTok there is an **auto mode**. Free, open source (GPL-3.0), no server, light on an ordinary
PC. Paths are relative to the repository root.

## 1. Read the relevant context first

- Start at `knowledge-base/INDEX.md`, pick the task row, and read only the listed
  notes plus the files the task touches. Notes above 8 KB: headings first.
- Any code change: the relevant sections of `knowledge-base/engineering-standards.md`.
- Ongoing work: `knowledge-base/plans/active-plans.md` → plan map → package
  "Resume here".
- Open decisions: `knowledge-base/open-questions.md`. Search it before asking again.
- Prefer `rg`. A typo or obvious one-line fix may skip these reads.

## 2. Invariants

The identity of the project ([core-principles](knowledge-base/decisions/core-principles.md)).
Breaking one needs a new decision and the maintainer's explicit OK first.

1. **Free and open source, forever.** GPL-3.0, no paid tier, no closed parts. The
   services' redrawn logos are the one named exception: trademarks of their owners,
   outside the GPL, kept apart with a notice
   ([redrawn-service-logos](knowledge-base/decisions/redrawn-service-logos.md)).
2. **No ads, no monetization in the app.** A donation link may live in the README only.
3. **No server.** No backend, API, database or proxy. floawty's own code talks only
   to the services the user opens and to GitHub Releases to check, download and
   install updates, only on the user's click or with automatic updates on (off by
   default). The Windows component WebView2 also
   sends diagnostic data to Microsoft and loads updates of its own components (e.g.
   the DRM module) from Microsoft; both are disclosed at first start, in
   PRIVACY.md and in the README, never hidden or denied
   ([webview2-diagnostics-disclosed](knowledge-base/decisions/webview2-diagnostics-disclosed.md),
   [webview2-component-updates-disclosed](knowledge-base/decisions/webview2-component-updates-disclosed.md)).
4. **No tracking.** Never telemetry, analytics, crash reporting, fingerprinting or
   unique IDs – not even opt-in.
5. **No accounts, no API keys.** Users sign in on the official sites.
6. **Download and run.** From GitHub Releases, without admin rights, runtime install
   or build step. Portable build + installer.
7. **Play fair with the services.** Embed the official web players only. Never
   circumvent or inspect DRM; never download, record or cache content; never block,
   modify or skip ads; never read, store or transmit credentials.
8. **Light on resources.** Runs next to other work on an ordinary PC
   (engineering standards §7).

## 3. Ask instead of inventing

If uncertainty affects scope, visible behavior, privacy, resource use or anything hard
to reverse, ask up to three focused questions and wait before the dependent change.
Continue independent work. Decide small, reversible details from existing conventions
and state material assumptions. Record open questions in
`knowledge-base/open-questions.md`; a TODO does not replace asking.

## 4. Explain materially better alternatives

Point out a materially simpler, safer, lighter or more private approach with its
benefit and tradeoff. Scope and product decisions belong to the maintainer.

## 5. Build the simplest solution

- Implement what the task needs now: no options, layers, config switches or extension
  points nobody asked for. Introduce an abstraction at the second real use.
- Prefer the platform over libraries; no UI framework unless a decision says so.
  Every new dependency needs a reason, the maintainer's OK and a GPL-3.0-compatible
  license (MIT, BSD, Apache-2.0, ISC, MPL-2.0, LGPL, GPL). Commit the lockfile.
- Handle failures at real boundaries (OS window APIs, web pages, files, user input);
  skip defensive code for states the code rules out.
- No drive-by refactors. Remove what a change makes obsolete (engineering standards §6).

## 6. Readable code, short comments, test first

Details and limits: `knowledge-base/engineering-standards.md`.

- Write the failing test first for pure logic, adapter behavior and every bug fix
  (red → green → refactor). Spikes and exploratory UI are named exceptions.
- Code reads top to bottom; TypeScript `strict`; files and functions stay within the
  size limits (§5), enforced by ESLint.
- A comment is one short sentence explaining a non-obvious **why**. Never restate the
  code, never multi-line essays or banners, never commented-out code.
- UI and end-to-end behavior is tested with Playwright over WebView2's debug port.

## 7. Architecture

**Stack:** Tauri 2 on the system WebView2 runtime, Rust for the shell, TypeScript for
the UI, Windows 10/11 only ([stack-by-spike](knowledge-base/decisions/stack-by-spike.md)).
Tauri is pinned to one minor version; an upgrade is its own task with smoke test and
live checks. WebView2 always starts with `--disable-background-networking`.
Prototype code stays on the `spike/*` branches; `spikes/measure` is the measuring tool.

- **Pure logic is separate:** geometry, snapping, opacity, settings and migration,
  hotkey mapping and the Shorts state machine have no window or DOM access.
- **Layout:** `src-tauri/` Rust shell (window, settings, hotkeys), `src/` TypeScript UI
  (Vite), `src/services/<id>/` adapters, `src/assets/logos/` the services' redrawn
  logos (trademarks, `NOTICE.md`), `src/assets/symbols/` floawty's own tile symbols.
- **Service adapters** are isolated modules `src/services/<id>/` with a manifest (id,
  name, start URL, allowed domains, brand colour, symbol) and an optional page script. Core code
  never contains service-specific `if`s. DOM selectors live in one `selectors.ts` per
  adapter.
- **Adapters fail soft:** a broken selector leaves a normal page, never a crash or
  freeze; the error is logged locally and shown as a small hint.
- **Security baseline** for web content: engineering standards §8.

## 8. Privacy and local data

- Settings: one human-readable JSON file in the OS user-data directory.
- One shared persistent WebView2 profile in the MVP, one per service once Tauri
  exposes profiles ([shared-webview2-profile-in-mvp](knowledge-base/decisions/shared-webview2-profile-in-mvp.md)).
  Cookies and storage never leave the machine and are never read by floawty's code.
  "Reset all data" wipes settings and the profile.
- Logs stay local and contain no watched URLs, titles or account data.

## 9. Product scope

**In scope** ([mvp-scope-and-controls](knowledge-base/decisions/mvp-scope-and-controls.md)):
overlay window (frameless, always on top, opacity 10–100 %, resize, drag, corner/edge
snapping, multi-monitor, remembered geometry) and a window mode (normal window) with
its own geometry; hover bar over the video; click-through with a corner dot and a
hotkey to leave it; configurable global hotkeys (default Ctrl+Alt+Shift); app tiles
with the services' redrawn logos ([redrawn-service-logos](knowledge-base/decisions/redrawn-service-logos.md))
and custom URL tiles; first-start notice about WebView2; best-effort "video only"
view; auto mode for YouTube Shorts and TikTok; a small sign-in window for a service's
sign-in pop-ups (Google, Apple, Facebook); export and import of settings, own tiles
and hotkeys (never logins); UI in English and German. Service tiles: YouTube,
Twitch, Netflix, Prime Video, Disney+, RTL+; further services once they pass a
maintainer test. Windows 10/11 only.

**Out of scope** (decision first): downloading, recording or screenshots of protected
content; ad blocking or sponsor skipping; own library, recommendations, social
features or sync; mobile apps.

**Auto mode** (YouTube Shorts, TikTok) lives in `src/services/short-feed/` and is used by
the adapters; it detects the end of a video (a loop jump, not only `ended`), moves on
through the service's own next control the way a user would, and is configurable
(on/off, delay, pause on hover). It never likes, follows, subscribes, comments or skips ads.

## 10. Verify before reporting completion

- `npm run verify` must pass: `npm run check` (types, lint, format, Vitest, adapter
  tests, `cargo clippy`, `cargo test`), build, `build:test-input`,
  `build:update-test`, `smoke:hidden`. A hidden run refuses an update-test build
  older than the build.
- **Hidden runs** start floawty on a desktop nobody sees, through `tools/test-input`
  ([app-tests-run-hidden](knowledge-base/decisions/app-tests-run-hidden.md)):
  `npm run smoke:hidden` with optional spec filters, and `verify`. Start them without
  asking; announce what runs.
- **Ask first**, one yes per run, a re-run after a failure asks again:
  `npm run measure` (hidden, but needs a quiet PC); the visible runs that take over
  the maintainer's mouse, keyboard and screen – `npm run smoke:real` (the `@real`
  release set), `npm run smoke` (all tests visible, optional) – and live probes on
  real services, even when they run hidden. Say how long mouse and keyboard are needed.
- App tests and measurements start only through these scripts, never with a direct
  `playwright test`. One app run at a time: every run holds the run lock, a second one
  is refused; never work around it. While working, use `npm run check` and single
  unit or adapter tests (`npm run test:adapters -- <file>`). App tests start floawty
  muted with a fresh profile (`launch()` in `tests/app.ts`).
- App runs go **smallest first**, as separate stages on a build of the current code
  (`npm run build` first; engineering standards §2):
  1. **Red or new test:** only those specs; a failure of unclear cause also runs on
     the last good build before anything wider.
  2. **Code final and reviewed:** all hidden app tests, normally once per package.
  3. **All app tests green:** measure, if the change needs it, only the affected
     scenarios, compared with the predecessor build measured hidden.
- Before a release, `npm run smoke:real` runs once on a local build of the commit to
  be tagged.
- Report after each stage. Stop at the first result that means the code must change;
  never start a wider stage on code that will change.
- Within these limits, verify yourself – run the app, drive it with Playwright or the
  built-in browser – instead of handing the maintainer a checklist. Leave only what
  needs their eyes or accounts (e.g. a logged-in Netflix check), and name it.
- Changes touching window handling, page scripts or startup: measure resources.
- Report what was verified and what was not; never call an unrun check passed.

Completion order: `npm run check` (10) → tech notes and CHANGELOG (11) → decisions
and open questions (11, 3) → final diff review → independent review (14) → all hidden
app tests, then the measurement after the maintainer's yes (10) → commit proposal (12).

## 11. Keep the knowledge current

- Update the owning note in the same change as the behavior. Tech notes describe the
  current state; rationale goes to `knowledge-base/decisions/`. Conventions:
  `knowledge-base/CLAUDE.md`.
- Record a significant decision (a choice among real alternatives, a stored format,
  a deliberate non-goal) from the template, with a hook line in `decisions.md`.
- Multi-session work is planned as small packages (`knowledge-base/planning.md`).
- User-facing changes get a plain-language line under `[Unreleased]` in
  `CHANGELOG.md`.
- No session journals or chat summaries.

## 12. Git and releases

- Inspect `git status` before editing. Stage only your own changes – never
  `git add -A` or `git add .`.
- After a completed task, propose an English Conventional Commit subject (`feat:`,
  `fix(youtube):`, `docs:`, …) and the exact file list; commit only after the
  maintainer's OK, push only on explicit request. One task normally means one commit.
- No AI attribution lines (`Co-Authored-By`, `Generated with`).
- External contributions come as pull requests against `main`; `main` stays buildable.
- Releases are built by GitHub Actions from a tag `vX.Y.Z`, never on a laptop.

## 13. Languages

Communicate with the maintainer in German. Code, identifiers, comments, commits, docs
and the knowledge base are English. Visible UI text exists in English and German in
one i18n file; no visible text is hard-coded in components.

## 14. Agents and tools

- The main session leads: scope, questions, briefs, integration, diff review,
  verification and the report stay with it. It delegates only bounded work with a
  clear advantage, at most two subagents at a time, a reviewer included. Parallel
  writers own disjoint files; a shared file (e.g. `src/i18n.ts`) has one owner.
  Workers never delegate further, commit or push; their success report is not
  acceptance – the main session reads the diff and runs the checks itself.
- Every work package and every other change to code, tests, build configuration or
  these rules gets an independent read-only review of its diff by a second agent
  before the commit proposal. Exception: in a multi-package plan, a package that
  touches only the UI layer (styles, markup, icons, texts, DOM code; no IPC, Rust,
  stored formats, service adapters, page scripts, dependencies or rules) gets the
  main session's recorded own review; the plan's last package then gets one
  independent review of all the plan's changes since the base commit named in the
  plan map, also due when a plan pauses or is dropped. Pure execution (rename,
  typo, one obvious fix) and changes only to notes or the CHANGELOG need none.
  Resolve each material finding – fix and re-check, or reject it with evidence – and
  record reviewer and resolution in the package's evidence, or for work outside a
  package in the report and the commit message. If no reviewer is available, say so and record your own review.
- Runtime-specific roles and models: `CLAUDE.md` for Claude.
- Use MCP servers only when the maintainer asks for them; built-in client tools
  (browser pane, desktop control) are not MCP servers in this sense.
