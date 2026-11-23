---
type: research
area: process
tags: [tests, input, hidden-desktop, hooking, hotkeys]
status: active
created: 2026-11-23
updated: 2026-11-23
source: web research and own probes on the maintainer's PC, 2026-11-23
---

# Isolated test input: cursor, foreground and hotkeys without the real screen

How floawty's app tests could use a mouse position, a foreground window and global
hotkeys without touching the maintainer's real mouse, keyboard, focus or screen.
Builds on the hidden-desktop runner of [[plan-quiet-tests]].

**Verification:** *probed* = shown by our own program on this PC (Windows 11 Pro
25H2, build 26200) on a hidden desktop; *documented* = Microsoft or library docs or
source; *reported* = forums, vendor docs, issues; *inferred* = our reasoning,
unverified. Maintainer constraint (2026-11-23): no Hyper-V, no Windows Sandbox, no
virtual machines.

## Result

| Rank | Option | Covers | Needs | Proved |
|---|---|---|---|---|
| 1 | Own test shim DLL + hidden desktop | hover bar, sign-in foreground, hotkeys; not the grip drag | nothing: no admin, install, restart; ~300 lines Rust | yes, against a stand-in exe |
| 2 | Cargo test feature in floawty (current qt-03) | same as 1 | a separate test build; hook code in the product source | no |
| 3 | Child session (loopback RDP) | all, with real input | admin once; a client window that stays open | no |
| – | Second user session, agent workspace, MXC, virtual input drivers | – | not viable today | no |
| – | Hyper-V, Windows Sandbox, VMs | – | excluded by the maintainer | – |

Recommendation: option 1. It tests the unchanged release `floawty.exe`, keeps
every hook out of the product, and needs no admin, install or restart.

## Probes (2026-11-23)

Programs in Rust with `windows-sys` 0.61, like floawty. A launcher creates a desktop
with `CreateDesktopW` (never switched to), starts the target there suspended inside a
kill-on-close job, loads the shim DLL with `CreateRemoteThread(LoadLibraryW)`, then
resumes it. The target mirrors floawty's reads (`bar.rs` `look`, `bar_has_keys`,
`overlay::is_active`, `settle.rs`). Nothing moved the real cursor, sent real input
or took the foreground. *(probed)*

- Without the shim on the hidden desktop: `GetCursorPos` fails, `GetForegroundWindow`
  is not the window, `GetGUIThreadInfo(0)` fails. *(probed)*
- With the shim: the target reads exactly what the test sets: cursor (300,250) then
  (900,900), foreground and focus on its window then none, left button down then up.
  The **real** `WindowFromPoint` at the fake position returns the target's window on
  the hidden desktop, so only the cursor needs faking, not the hit test. *(probed)*
- `RegisterHotKey` is session-wide: the same combination registered on the default
  desktop and on the hidden desktop collides (error 1409,
  `ERROR_HOTKEY_ALREADY_REGISTERED`) in both orders. A test floawty would take the
  maintainer's hotkeys or lose its own. *(probed; matches ReactOS's single hotkey
  list, documented)*
- With the shim faking `RegisterHotKey`, the target registers Ctrl+Alt+Shift+F24 while
  a process on the real desktop holds the same combination; the shim's thread then
  posts `WM_HOTKEY` (id 7) to the target's window on request. The real holder got
  nothing. *(probed)*
- `PostMessage(WM_HOTKEY)` to a window on the hidden desktop: from the default desktop
  error 1400 (invalid handle), from a process on the hidden desktop delivered.
  `PostThreadMessage` across desktops: error 1444. *(probed; "messages only between
  processes on the same desktop", documented)*
- `SendInput` inside the shimmed target is swallowed and counted (1 call). *(probed)*
- Defender real-time protection on, Smart App Control off: 3 shim runs, no detection
  in `Get-MpThreatDetection`. *(probed; not proof for future signatures)*
- `floawty.exe` (release, 2026-11-21) imports `GetCursorPos`, `WindowFromPoint`,
  `GetForegroundWindow`, `GetGUIThreadInfo`, `GetAsyncKeyState`, `GetKeyState`,
  `RegisterHotKey`, `UnregisterHotKey`, `SendInput`, `SetForegroundWindow` in its one
  `user32.dll` import descriptor; read from the mapped image without running it.
  `windows-sys` 0.61 links via `windows-link` raw-dylib, which still fills the exe's
  import table, and all crates (tao, wry, global-hotkey, floawty) share it.
  *(probed; documented)*

Probe source and logs: `hookprobe/` in the quiet-tests side-session notes folder (outside the repo), with `fake` (shim, 121
lines, 124 KB DLL), `probe` bins `launch`, `target`, `hotkey`, `hkwin`, `imports`.

## Side findings worth acting on

- **tao's focus trick sends real input.** `Window::set_focus` calls
  `force_window_active`, which, when `SetForegroundWindow` fails, sends an Alt
  press and release with `SendInput` (tao 0.37.2 `window.rs` l.1514). floawty calls
  it in `overlay::toggle_visible` (`ShowHide::Raise`). On the hidden desktop
  `SetForegroundWindow` always fails. Whether that `SendInput` then reaches the
  maintainer's desktop is unmeasured; `GetCursorPos` docs require the input desktop,
  `SendInput` docs say nothing about other desktops. *(documented source; leak
  inferred)* The shim swallows it; without the shim, the show/hide test must not run
  hidden.
- **Hotkey collision** (above) also affects qt-02 as planned: posting `WM_HOTKEY`
  works, but registration still collides with a running real floawty. Fix: the shim,
  or a test profile whose hotkeys differ from the defaults.
- **global-hotkey 0.8** registers on its own hidden top-level window (class
  `global_hotkey_app`), dispatches `WM_HOTKEY` by `wParam` id, then polls
  `GetAsyncKeyState(vk)` every 50 ms for the release. On a non-input desktop the real
  `GetAsyncKeyState` returns 0, so "released" follows at once. *(documented source;
  GetAsyncKeyState doc)*

## Options

### 1. Test shim DLL loaded only into the tested exe (recommended)

**How:** a small Rust `cdylib` rewrites `floawty.exe`'s own import table (IAT) for a
few `user32` functions and answers them from a shared-memory block the test writes:

| Function | Shim answer |
|---|---|
| `GetCursorPos` | test cursor, or failure when unset |
| `GetForegroundWindow`, `GetGUIThreadInfo(0)` | test foreground and focus window |
| `GetAsyncKeyState(VK_LBUTTON/RBUTTON)` | test button state; other keys real |
| `RegisterHotKey`, `UnregisterHotKey` | kept in the shim's table, never in Windows' |
| `SendInput` | swallowed, counted |
| `SetForegroundWindow` (optional) | set the test foreground, as Windows would grant it *(not probed)* |

`WindowFromPoint`, `GetAncestor`, `IsChild` stay real: the hidden desktop has a
correct window layout. A launcher (Rust exe) starts `floawty.exe` suspended on the
hidden desktop, loads the shim, resumes it, and offers the test a line protocol on
stdin (`cursor 300 250`, `foreground main`, `button left down`, `hotkey ^%+t`). In
`tests/app.ts`, `launch()` spawns the launcher instead of the exe in hidden runs.

**Covers:** the hover-bar tests (cursor), the sign-in tests (foreground: the test
sets "other window in front" instead of clicking it), the hotkey tests (including
show/hide, since `SendInput` is swallowed), click-through's hotkey. Page clicks and
typing stay CDP. **Not covered:** the grip drag (`startDragging` → `WM_NCLBUTTONDOWN`
→ the move loop runs in win32k and reads the real cursor; posted mouse messages can
end it but not steer it *(reported/inferred)*). The suggestion-list test is likely
covered but unverified: Chromium's pop-up lives in `msedgewebview2.exe`, which the
shim does not touch.

**Build:** `tools/test-input/` (own Cargo workspace, outside `src-tauri`): shim ~150
lines, launcher ~150 lines, a ~50-line TS helper. Only dependency `windows-sys`
(already used, MIT/Apache-2.0). No hooking library needed; if a later need arises,
MinHook (BSD-2), `minhook` crate (MIT), `retour` (BSD-2), `ilhook` (MIT) and
Microsoft Detours (MIT) are all GPL-3.0-compatible. *(documented)*

**Needs:** no admin, install, restart or licence; same-user processes can be injected.

**Risks:**
- IAT-only: a call resolved by `GetProcAddress` or made from another DLL is missed.
  Mitigation: the shim reports the functions it patched and the launcher fails with
  that cause if one is missing (plan rule "fails with its cause, never silently").
- `CreateRemoteThread` + `LoadLibraryW` is the textbook injection pattern Defender
  watches; no detection seen. Fallback without a remote thread: add the DLL to the
  suspended process's import table (Detours `DetourCreateProcessWithDllEx`, MIT).
- Smart App Control in enforcement mode would block the unsigned DLL; it is off here
  and floawty's unsigned dev builds would be blocked too. *(documented/probed)*
- The fake answers must match what Windows would say (e.g. foreground ownership);
  wrong fakes test the shim, not floawty. Keep the shim minimal.

### 2. Combined with the hidden desktop

Already part of option 1 and probed: the desktop gives a real window layout, real
rendering, CDP input and isolation of focus and screen; the shim adds what the
desktop cannot (cursor, foreground, hotkeys without collision). Neither alone
suffices: the desktop alone lacks cursor and foreground; the shim alone on the real
desktop would still show floawty on the maintainer's screen. *(probed)*

### 3. Child session (loopback RDP tied to the user's session)

**How:** host the Remote Desktop ActiveX control, set `ConnectToChildSession`, call
`Connect`; Windows signs the same user into a second session with its own desktop,
cursor, foreground and (probably) hotkey table. Tests inside use real `SendInput`.
Power Automate's "picture in picture" and UiPath's PiP use it. *(documented)*

**Covers:** all tests including the grip drag, with real input. **Needs:** enabling
(`WTSEnableChildSessions`) needs admin once *(documented by Power Automate)*;
Windows 11 Pro supported; no restart documented. Today `fDenyTSConnections = 1` here
and RDP to localhost must work. **Risks:** a client window must exist; minimized
needs `RemoteDesktop_SuppressWhenMinimized = 2` (reported, unreliable on Windows 11),
Microsoft's own tooling keeps it connected, non-minimized and off-screen
*(reported)*; shared profile and files with the parent session; credential prompts
with PIN-only sign-in; no restart while open. Conflicts with the plan's "no admin"
and was rejected earlier for the open window. Sample: LocalRDP (MIT), MsRdpEx.
**Not probed** (needs admin).

### 4. Other ways examined

- **Second user session / loopback RDP to 127.0.0.2:** Windows client editions allow
  one interactive session; a second user takes over the console. Patches like RDP
  Wrapper break the licence terms. *(reported/documented)*
- **Agent workspace (Windows "experimental agentic features"):** separate session and
  desktop per agent, but Insider preview, admin to enable, no API to run own apps
  with input. *(documented)*
- **MXC isolation sessions (Microsoft Execution Containers, MIT, GA 2026-10):**
  separate session with own input boundary, but initially non-interactive; input
  injection blocked. Worth watching. *(documented/reported)*
- **Virtual input drivers (vmulti, ViGEm):** admin and driver install, move the real
  cursor; ViGEm retired. *(documented)*
- **How others do it:** Chromium's `interactive_ui_tests` and WinAppDriver need a
  real, unlocked, foreground desktop; Electron skipped its Windows global-shortcut
  test; PowerToys' new harness keeps UIA-pattern actions "headless", injected input
  needs the foreground. No open-source fake-cursor tool exists; closest is
  gmock-win32 (MIT, IAT mocking for unit tests). *(documented/reported)*
- **Hyper-V, Windows Sandbox:** excluded by the maintainer. For the record: `wsb exec
  --run-as ExistingLogin` needs a connected client window. *(documented)*

### 5. Cargo test feature in floawty (the current qt-03 design)

Same coverage as option 1, no injection and no Defender question, but hook code in
the product source and a separate test build, so the tested exe is not the release
exe. The hotkey collision and tao's `SendInput` still need handling. *(inferred)*

## Open points

- Does tao's `SendInput` from the hidden desktop reach the real desktop? Measuring it
  means sending one real Alt press: ask the maintainer first.
- Does the suggestion list open and stay open on the hidden desktop?
- Should the shim's `SetForegroundWindow` set the test foreground (needed for the
  show/hide "brings to the front" check)?
- The grip drag stays on the real screen, or is tested one level lower (that
  `startDragging` was requested, plus the settle logic with a test button state).

## Sources

- GetCursorPos (input desktop required): https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getcursorpos
- RegisterHotKey: https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-registerhotkey
- ReactOS hotkey list: https://github.com/reactos/reactos/blob/master/win32ss/user/ntuser/hotkey.c
- Desktops and messages: https://learn.microsoft.com/en-us/windows/win32/winstation/desktops
- GetAsyncKeyState: https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getasynckeystate
- global-hotkey Windows backend: https://github.com/tauri-apps/global-hotkey/blob/dev/src/platform_impl/windows/mod.rs
- tao Windows window: https://github.com/tauri-apps/tao/blob/dev/src/platform_impl/windows/window.rs
- windows-link raw-dylib: https://docs.rs/crate/windows-link/0.2.1/source/src/lib.rs ; RFC 2627: https://rust-lang.github.io/rfcs/2627-raw-dylib-kind.html
- Detours: https://github.com/microsoft/Detours ; DetourCreateProcessWithDllEx: https://github.com/microsoft/Detours/wiki/DetourCreateProcessWithDllEx
- MinHook: https://github.com/TsudaKageyu/minhook ; retour: https://github.com/hpmason/retour-rs ; ilhook: https://lib.rs/crates/ilhook ; gmock-win32: https://github.com/perfectco/gmock-win32
- Defender runtime scanning on CreateRemoteThread: https://labs.withsecure.com/blog/bypassing-windows-defender-runtime-scanning
- Smart App Control: https://support.microsoft.com/windows/smart-app-control-faq-285ea03d-fa88-4d56-882e-6698afdb7003
- Move/size loop: https://learn.microsoft.com/en-us/windows/win32/winmsg/wm-entersizemove ; https://github.com/reactos/reactos/blob/master/win32ss/user/ntuser/nonclient.c
- Child sessions: https://learn.microsoft.com/en-us/windows/win32/termserv/child-sessions ; https://learn.microsoft.com/en-us/power-automate/desktop-flows/run-desktop-flows-pip ; https://docs.uipath.com/assistant/standalone/2025.10/user-guide/pip-child-session ; https://github.com/charles-cty/LocalRDP ; https://github.com/microsoft/winappCli/issues/769
- Agent workspace: https://support.microsoft.com/en-us/windows/ai/ai-features/experimental-agentic-features
- MXC: https://learn.microsoft.com/en-us/windows/apps/develop/mxc/platform-support ; https://github.com/microsoft/mxc/issues/1705
- Windows Sandbox CLI: https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-cli
- Chromium ui_controls: https://chromium.googlesource.com/chromium/src/+/HEAD/ui/base/test/ui_controls_internal_win.cc
- WinAppDriver on remote/locked machines: https://github.com/microsoft/WinAppDriver/blob/master/Docs/RunningOnRemoteMachine.md
- winapp CLI UI automation: https://learn.microsoft.com/en-us/windows/apps/dev-tools/winapp-cli/ui-automation
