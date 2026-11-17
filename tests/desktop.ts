// Moves the real mouse cursor: the bar reacts to where Windows sees it, not to page events.
// Moving the mouse yourself while these tests run makes them fail.
import { execFileSync } from 'node:child_process';

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
