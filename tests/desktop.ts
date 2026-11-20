// Real mouse and keyboard input: the bar reacts to where Windows sees the cursor, global
// hotkeys to real key presses. Using the mouse yourself while these tests run makes them fail.
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';

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

const OWNED_POPUPS = `
param([int]$ProcessId)
Add-Type @"
using System; using System.Runtime.InteropServices;
public static class Owned {
  public delegate bool Visit(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] public static extern bool EnumWindows(Visit visit, IntPtr p);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr h, uint cmd);
}
"@
$main = (Get-Process -Id $ProcessId).MainWindowHandle
$global:count = 0
[Owned]::EnumWindows({ param($h, $p)
  if ([Owned]::IsWindowVisible($h) -and [Owned]::GetWindow($h, 4) -eq $main) { $global:count++ }
  return $true }, [IntPtr]::Zero) | Out-Null
$global:count
`;

/** Visible windows owned by floawty's window, such as a page's suggestion list. */
export function ownedPopups(pid: number): number {
  const command = `& {${OWNED_POPUPS}} ${pid}`;
  return Number(
    execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', command], {
      encoding: 'utf8',
    }).trim(),
  );
}

const WINDOW = `
param([int]$ProcessId, [string]$Action, [int]$A, [int]$B)
Add-Type @"
using System; using System.Runtime.InteropServices;
public struct Frame { public int L, T, R, B; }
public static class Win {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out Frame r);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int ht, bool paint);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out Frame p);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(int f, int x, int y, int d, int e);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
}
"@
[Win]::SetProcessDPIAware() | Out-Null
$h = (Get-Process -Id $ProcessId).MainWindowHandle
$r = New-Object Frame
[Win]::GetWindowRect($h, [ref]$r) | Out-Null
if ($Action -eq 'resize') { [Win]::MoveWindow($h, $r.L, $r.T, $A, $B, $true) | Out-Null }
if ($Action -eq 'drag') {
  $p = New-Object Frame; [Win]::GetCursorPos([ref]$p) | Out-Null
  [Win]::mouse_event(2, 0, 0, 0, 0)
  for ($i = 1; $i -le 10; $i++) { Start-Sleep -Milliseconds 20; [Win]::SetCursorPos($p.L + $A * $i / 10, $p.T + $B * $i / 10) | Out-Null }
  [Win]::mouse_event(4, 0, 0, 0, 0)
  Start-Sleep -Milliseconds 100
  [Win]::GetWindowRect($h, [ref]$r) | Out-Null
}
"$($r.L) $($r.T)"
`;

function windowCall(pid: number, action: string, a = 0, b = 0): { x: number; y: number } {
  const command = `& {${WINDOW}} ${pid} ${action} ${a} ${b}`;
  const out = execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', command], {
    encoding: 'utf8',
  });
  const [x, y] = out.trim().split(' ').map(Number);
  return { x: x ?? NaN, y: y ?? NaN };
}

/** floawty's window position in screen pixels. */
export function windowPosition(pid: number): { x: number; y: number } {
  return windowCall(pid, 'where');
}

/** Holds the left button where the cursor is and drags by (dx, dy) screen pixels. */
export function dragBy(pid: number, dx: number, dy: number): { x: number; y: number } {
  return windowCall(pid, 'drag', dx, dy);
}

/** Resizes floawty's window in screen pixels, as Windows does for a drag on its border. */
export function resizeWindow(pid: number, width: number, height: number): void {
  windowCall(pid, 'resize', width, height);
}

// Found by title: once floawty's window is hidden, the process's MainWindowHandle names another one.
const FLAGS = `
param([int]$ProcessId, [string]$Title, [string]$Action)
Add-Type @"
using System; using System.Runtime.InteropServices; using System.Text;
public static class Flags {
  public delegate bool Visit(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] public static extern bool EnumWindows(Visit visit, IntPtr p);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowTextW(IntPtr h, StringBuilder text, int max);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetWindowLongPtrW(IntPtr h, int index);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetLayeredWindowAttributes(IntPtr h, out uint key, out byte alpha, out uint flags);
  [DllImport("user32.dll")] public static extern bool PostMessageW(IntPtr h, uint msg, IntPtr w, IntPtr l);
}
"@
$global:found = [IntPtr]::Zero
[Flags]::EnumWindows({ param($h, $p)
  $owner = 0; [Flags]::GetWindowThreadProcessId($h, [ref]$owner) | Out-Null
  $text = New-Object System.Text.StringBuilder 256; [Flags]::GetWindowTextW($h, $text, 256) | Out-Null
  if ($owner -eq $ProcessId -and $text.ToString() -eq $Title) { $global:found = $h; return $false }
  return $true }, [IntPtr]::Zero) | Out-Null
$h = $global:found
if ($h -eq [IntPtr]::Zero) { 'missing'; return }
# WM_SYSCOMMAND with SC_MINIMIZE, as the taskbar button sends it.
if ($Action -eq 'minimize') { [Flags]::PostMessageW($h, 0x112, [IntPtr]0xF020, [IntPtr]::Zero) | Out-Null }
$topmost = ([Flags]::GetWindowLongPtrW($h, -20).ToInt64() -band 8) -ne 0
$key = 0; $alpha = 255; $mode = 0
if (-not [Flags]::GetLayeredWindowAttributes($h, [ref]$key, [ref]$alpha, [ref]$mode)) { $alpha = 255 }
"$([Flags]::IsWindowVisible($h)) $topmost $([Flags]::GetForegroundWindow() -eq $h) $([Flags]::IsIconic($h)) $alpha"
`;

export interface WindowFlags {
  visible: boolean;
  topmost: boolean;
  foreground: boolean;
  minimized: boolean;
  /** Layered-window alpha, 0–255. */
  alpha: number;
}

function flagsCall(pid: number, title: string, action: string): WindowFlags {
  const command = `& {${FLAGS}} ${pid} '${title}' ${action}`;
  const out = execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', command], {
    encoding: 'utf8',
  }).trim();
  if (out === 'missing') throw new Error(`no window "${title}" in process ${pid}`);
  const [visible, topmost, foreground, minimized, alpha] = out.split(' ');
  return {
    visible: visible === 'True',
    topmost: topmost === 'True',
    foreground: foreground === 'True',
    minimized: minimized === 'True',
    alpha: Number(alpha),
  };
}

/** A process's window with this title: visible, always on top, active, minimized, opacity. */
export function windowFlags(pid: number, title = 'floawty'): WindowFlags {
  return flagsCall(pid, title, 'read');
}

/** Minimizes floawty's window the way its taskbar button does. */
export function minimize(pid: number): void {
  flagsCall(pid, 'floawty', 'minimize');
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
