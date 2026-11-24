// Real mouse and keyboard input and the real foreground. A spec that calls these directly carries
// `@real` and stays out of the hidden run; `visibleInput` is the same through app.ts in a visible
// run, which the tag scan does not see. Using the mouse yourself while they run makes them fail.
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import type { AppInput } from './app-input';
import { windowFlags, windowPosition } from './desktop';

const SCRIPT = `
param([int]$ProcessId, [double]$Fx, [double]$Fy)
Add-Type @"
using System; using System.Runtime.InteropServices;
public struct Box { public int L, T, R, B; }
public static class Desk {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out Box r);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
}
"@
[Desk]::SetProcessDPIAware() | Out-Null
$box = New-Object Box
[Desk]::GetWindowRect((Get-Process -Id $ProcessId).MainWindowHandle, [ref]$box) | Out-Null
if ($Fx -lt 0) { [Desk]::SetCursorPos($box.L - 200, $box.T - 200) | Out-Null }
else { [Desk]::SetCursorPos([int]($box.L + ($box.R - $box.L) * $Fx), [int]($box.T + ($box.B - $box.T) * $Fy)) | Out-Null }
`;

function run(pid: number, fx: number, fy: number): void {
  const command = `& {${SCRIPT}} ${pid} ${fx} ${fy}`;
  execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', command]);
}

/** Puts the cursor at a fraction of floawty's window, e.g. (0.5, 0.6) for the video's middle. */
export function pointAt(pid: number, fx: number, fy: number): void {
  run(pid, fx, fy);
}

/** Moves the cursor off floawty's window. */
export function pointAway(pid: number): void {
  run(pid, -1, -1);
}

/** Clicks the left mouse button at a fraction of floawty's window. */
export function clickAt(pid: number, fx: number, fy: number): void {
  run(pid, fx, fy);
  const click = `Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int f, int x, int y, int d, int e);' -Name Mouse -Namespace Desk; [Desk.Mouse]::mouse_event(2, 0, 0, 0, 0); [Desk.Mouse]::mouse_event(4, 0, 0, 0, 0)`;
  execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', click]);
}

/** Types through Windows' input queue (SendKeys syntax, e.g. "^%+o"): global hotkeys need real key presses. */
export function pressKeys(keys: string): void {
  const command = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${keys}')`;
  execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', command]);
}

const DRAG = `
param([int]$Dx, [int]$Dy)
Add-Type @"
using System; using System.Runtime.InteropServices;
public struct Spot { public int X, Y; }
public static class Drag {
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out Spot p);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(int f, int x, int y, int d, int e);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
}
"@
[Drag]::SetProcessDPIAware() | Out-Null
$p = New-Object Spot; [Drag]::GetCursorPos([ref]$p) | Out-Null
[Drag]::mouse_event(2, 0, 0, 0, 0)
for ($i = 1; $i -le 10; $i++) { Start-Sleep -Milliseconds 20; [Drag]::SetCursorPos($p.X + $Dx * $i / 10, $p.Y + $Dy * $i / 10) | Out-Null }
[Drag]::mouse_event(4, 0, 0, 0, 0)
Start-Sleep -Milliseconds 100
`;

/** Holds the left button where the cursor is and drags by (dx, dy) screen pixels. */
export function dragBy(pid: number, dx: number, dy: number): { x: number; y: number } {
  const command = `& {${DRAG}} ${dx} ${dy}`;
  execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', command]);
  return windowPosition(pid);
}

/** The title of the window `openOtherWindow` opens. */
export const OTHER_TITLE = 'floawty test window';

// On top, so it never opens behind a maximized window and the click always lands on it.
const OTHER_WINDOW = `Add-Type -AssemblyName System.Windows.Forms
$form = New-Object System.Windows.Forms.Form
$form.Text = '${OTHER_TITLE}'
$form.TopMost = $true
$form.StartPosition = 'Manual'
$form.Location = New-Object System.Drawing.Point(80, 80)
$form.Size = New-Object System.Drawing.Size(320, 200)
[System.Windows.Forms.Application]::Run($form)`;

/** Opens a plain window of another app at the top left, to take the foreground from floawty. */
export function openOtherWindow(): ChildProcess {
  // windowsHide would hide the form as well, not only the console.
  return spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', OTHER_WINDOW]);
}

async function until(check: () => boolean, what: string): Promise<void> {
  const deadline = Date.now() + 15_000;
  for (;;) {
    try {
      if (check()) return;
    } catch {
      // The window is not there yet.
    }
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

// The grip substitute swallows the OS drag in the launcher's shim; a visible run has none.
function unsupported(name: string): () => Promise<never> {
  return async () => {
    throw new Error(`${name} needs the hidden launcher`);
  };
}

/** A visible run's cursor, click and foreground: the real ones, on the maintainer's screen. */
export function visibleInput(pid: number): AppInput {
  let other: ChildProcess | undefined;
  let moved = false;
  return {
    point: async (fx, fy) => {
      moved = true;
      pointAt(pid, fx, fy);
    },
    pointAway: async () => {
      moved = false;
      pointAway(pid);
    },
    click: async (fx, fy) => {
      moved = true;
      clickAt(pid, fx, fy);
    },
    foreground: async (name) => {
      if (name !== 'other') throw new Error(`foreground "${name}" is not supported visibly`);
      other ??= openOtherWindow();
      const otherPid = other.pid ?? 0;
      await until(() => windowFlags(otherPid, OTHER_TITLE).visible, 'the other window');
      moved = true;
      clickAt(otherPid, 0.5, 0.5);
      await until(() => windowFlags(otherPid, OTHER_TITLE).foreground, 'the other window in front');
    },
    press: unsupported('press'),
    release: unsupported('release'),
    // A cursor left over floawty would show the next test's bar before it asks for it.
    stop: () => {
      other?.kill();
      if (moved) pointAway(pid);
    },
  };
}
