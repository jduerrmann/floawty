---
type: plan
tags: [package, tests, process]
status: done
created: 2026-11-23
updated: 2026-11-23
source: visual plan "Testen ohne deinen Bildschirm", re-cut in chat and after two advisor checks, 2026-11-23
---

# qt-01 – Test input tool: launcher and shim

Plan: [[plan-quiet-tests]]

## Outcome
`tools/test-input/` starts a command on a hidden desktop and loads a shim into every
`floawty.exe` it starts, so floawty's hotkeys, `SendInput` and browser starts never
reach Windows.

## Scope
- Owns: `tools/test-input/` (own Cargo workspace, `windows-sys` only: launcher exe,
  shim `cdylib`, shared state type), its build step and its checks in `npm run check`.
- Non-goals: the test side (qt-02), cursor and foreground (qt-03), floawty's code.
- Read first: [[isolated-test-input]], [[plan-quiet-tests]] (advisor findings), the
  probe sources in the research session's notes (`hookprobe/`).

## Acceptance criteria
- [ ] Runner: a desktop never switched to; the command runs there in a kill-on-close
      job (job handle not inheritable); output and exit code pass through; a
      machine-wide mutex refuses a second run with that cause; a hard timeout ends
      the job.
- [ ] Start: `floawty.exe` starts suspended, the shim loads, and floawty resumes only
      after a complete handshake (state version and the mask of patched functions);
      otherwise floawty is terminated and the cause named, including a blocked DLL.
- [ ] Children: a `floawty.exe` that floawty starts (restart) gets the shim the same
      way; no floawty in the job runs without it.
- [ ] Hotkeys live in the shim's table: a duplicate is refused like Windows does; a
      protocol command marks a combination "held by another app"; the launcher posts
      `WM_HOTKEY` in order to the window that registered the combination (`ok` means
      posted, not handled); an unknown combination answers an error.
- [ ] `SendInput` and `ShellExecuteW` from floawty are swallowed and counted.
- [ ] Line protocol on the launcher: one reply per command (`ok` or an error with its
      cause); the first line reports floawty's pid; floawty's output never mixes in.
- [ ] Proven against the release exe on the hidden desktop (see Tests first).

## Tests first
- Before the tool: the research probe (`launch.exe` + `fake.dll`) against the release
  `floawty.exe` hidden: loader start on the remote thread, patch count, one hotkey,
  Defender detections. If it fails, stop and report: the Cargo-feature build is back
  on the table.
- Rust tests: hotkey table (register, duplicate refused, held by another app,
  unregister, ordered queue, unknown press), handshake (missing function, version
  mismatch), protocol parser.

## Checks
- `npm run check` with the tool's fmt, clippy and tests; one hidden start of the
  release exe through the launcher (asked until qt-04).

## Evidence
- Proof against floawty (2026-11-23, maintainer's yes, hidden): release exe of main
  2df7643 plus the logo icon, started suspended on a hidden desktop in a kill-on-close
  job, research shim injected with `CreateRemoteThread(LoadLibraryW)` before resume:
  loaded (module returned), 7 `user32` imports patched, floawty started normally
  ("started, WebView2 157.0.4341.60"). Ctrl+Alt+Shift+T stayed registrable on the real
  desktop the whole time. Two shim presses set `alwaysOnTop` false, then true again.
  `SendInput` calls: 0 in this run. After the job ended no `floawty.exe` was left;
  Defender: no detection. Proof source: this session's notes, `proof/`.

- Tool written by `coder` (delegated slice, brief with the acceptance criteria above);
  the lead read the shim, hooks, injection and `floawty` mode and added a guard:
  `floawty` mode refuses on the input desktop (seen: "refused on the visible
  desktop", exit 125). 74 Rust tests, written red first except the two hook tests.
- `npm run check` (lead, 2026-11-23): passed; Vitest 106, adapters 161, cargo 129 +
  tool 20 + 50 + 4.
- Hidden start of the release exe of this branch through `test-input run` →
  `test-input floawty` (maintainer's yes): desktop `floawty-test-<pid>`, `pid` line,
  floawty started normally; Ctrl+Alt+Shift+T free in Windows meanwhile; two
  `hotkey` presses set `alwaysOnTop` false, then true; an unregistered combination
  answered `error not registered`; `counts` 0/0; `quit` ended all; no `floawty.exe`
  or launcher left; Defender: no detection.
- Review fixes (`coder`, 2026-11-23), launcher at `target/release/test-input.exe`, `run`
  with harmless commands, exact outputs: `run -- cmd /c echo hi` → `hi`, exit 0;
  `run -- cmd /c exit 7` → exit 7; `run --timeout-s 2 -- cmd /c "ping -n 30 127.0.0.1 > nul"`
  → `test-input: the run took longer than 2 s; every process of it was ended`, exit 124,
  no `ping` left; a second `run` while one is active → `test-input: another app test
  run is active`, exit 125 (the first run exit 0, a third run after it works);
  `floawty C:\Windows\System32\cmd.exe` inside `run` → `error the shim could not patch:
  RegisterHotKey, UnregisterHotKey, SendInput, ShellExecuteW, CreateProcessW`, exit 125;
  `floawty C:\nope\floawty.exe` inside `run` → `error cannot start C:\nope\floawty.exe
  (error 2)`, exit 125; the launcher copied without its DLL → `error the shim DLL is
  missing: <dir>\floawty_test_shim.dll`, exit 125; `floawty` started directly on the real
  desktop → `error refused outside a hidden test desktop: start the tests through
  `test-input run``, exit 125. Stand-in exe with floawty's five imports (outside the repo)
  inside `run`: `children` → `ok <pid>`; a child started with an environment without
  `FLOAWTY_TEST_INPUT` → CreateProcessW false (error 5) and `children` → `error child
  failed: child <pid>: the shim DLL did not load (a blocked, missing or refused DLL):
  the shim did not report back: it never started`. 87 Rust tests green.

## Review (advisor, 2026-11-23): no blocker, all findings fixed
1. A stale handshake of a reused pid could pass – fixed: the pid's slot is cleared
   before each load.
2. The input-desktop guard refused falsely on a locked screen – replaced: only a desktop
   named `floawty-test-…` (made by `run`) is accepted.
3. Criterion said "queued by floawty's thread" – reworded to what the code does; manual
   `run` evidence added above; restart children on the real exe move to qt-02.
4. `GetLastError` after a freed temporary – the names are bound first.
5. Unchecked `VirtualProtect` – checked; a failure surfaces as "could not patch X".
6. Simplicity – event push channel replaced by a `children` pull command, key names
   trimmed to what floawty stores, `required_mask`, `MAGIC` and a duplicate helper deleted.
7–9. Unquoted restart path with spaces recognised; 64-bit `compile_error!`; long
   functions split, one-sentence doc comments, no reference over shared memory.
10. Browser opens by the test run itself – a qt-02 criterion.
Still open, observed later: the global mutex across the MSIX container (a run from
Claude Code and one from a plain terminal at once).
- After the fixes (lead): `npm run check` passed (Vitest 106, adapters 161, cargo 129 +
  tool 25 + 57 + 5); the hidden start of the release exe repeated with the same result,
  plus `children` → `ok`; nothing left over; Defender: no detection.

## Resume here
Branch `feat/qt-01-hidden-runner` in `.claude/worktrees/quiet-tests`, from main
2df7643. qt-01 is complete: checks, review and the hidden start after the fixes are
green; waiting for the maintainer's OK on the commit. Open points for qt-02 (none block):
WM_HOTKEY lParam without MOD_NOREPEAT, the same window and id twice, the error code of
a failed child start, `counts` counts calls. Next: commit, then qt-02.
