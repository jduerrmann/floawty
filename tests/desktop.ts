// Window queries and actions that work on any desktop: where a window is, its flags, its size, its popups.
import { execFileSync } from 'node:child_process';
import type { Rect } from './screen-point';

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
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
}
"@
[Win]::SetProcessDPIAware() | Out-Null
$h = (Get-Process -Id $ProcessId).MainWindowHandle
$r = New-Object Frame
[Win]::GetWindowRect($h, [ref]$r) | Out-Null
if ($Action -eq 'resize') { [Win]::MoveWindow($h, $r.L, $r.T, $A, $B, $true) | Out-Null }
if ($Action -eq 'move') { [Win]::MoveWindow($h, $A, $B, $r.R - $r.L, $r.B - $r.T, $true) | Out-Null }
"$($r.L) $($r.T) $($r.R) $($r.B)"
`;

function windowCall(pid: number, action: string, a = 0, b = 0): Rect {
  const command = `& {${WINDOW}} ${pid} ${action} ${a} ${b}`;
  const out = execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', command], {
    encoding: 'utf8',
  });
  const [left, top, right, bottom] = out.trim().split(' ').map(Number);
  return { left: left ?? NaN, top: top ?? NaN, right: right ?? NaN, bottom: bottom ?? NaN };
}

/** floawty's window position in screen pixels. */
export function windowPosition(pid: number): { x: number; y: number } {
  const { left, top } = windowCall(pid, 'where');
  return { x: left, y: top };
}

/** floawty's window frame in physical screen pixels, the frame its cursor and clicks are set in. */
export function windowRect(pid: number): Rect {
  const rect = windowCall(pid, 'where');
  // A hidden window has no main window handle, and its rect reads as all zero.
  if (rect.right <= rect.left || rect.bottom <= rect.top) {
    throw new Error(`floawty ${pid} has no visible window to point at`);
  }
  return rect;
}

/** Resizes floawty's window in screen pixels, as Windows does for a drag on its border. */
export function resizeWindow(pid: number, width: number, height: number): void {
  windowCall(pid, 'resize', width, height);
}

/** Moves floawty's window so its outer top left is at (x, y), as a plain move without a mouse drag. */
export function moveWindow(pid: number, x: number, y: number): void {
  windowCall(pid, 'move', x, y);
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
