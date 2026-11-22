// Window mode's title bar colour as Windows holds it, and the message that resets it.
import { execFileSync } from 'node:child_process';

const SCRIPT = `
param([int]$ProcessId, [string]$Action)
Add-Type @"
using System; using System.Runtime.InteropServices;
public static class TitleBar {
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int attribute, out int value, int size);
  [DllImport("user32.dll")] public static extern IntPtr SendMessageW(IntPtr h, uint message, IntPtr w, IntPtr l);
}
"@
$h = (Get-Process -Id $ProcessId).MainWindowHandle
# WM_SETTINGCHANGE, to floawty's window only: Windows itself stays untouched.
if ($Action -eq 'change') { [TitleBar]::SendMessageW($h, 0x1A, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null }
$value = 0
if ([TitleBar]::DwmGetWindowAttribute($h, 20, [ref]$value, 4) -ne 0) { 'unknown' } else { $value }
`;

function call(pid: number, action: 'read' | 'change'): string {
  return execFileSync(
    'powershell',
    ['-NoProfile', '-NonInteractive', '-Command', `& {${SCRIPT}} ${pid} ${action}`],
    { encoding: 'utf8' },
  ).trim();
}

export function titleBarIsDark(pid: number): boolean {
  const value = call(pid, 'read');
  if (value === 'unknown') throw new Error('Windows does not report the title bar colour');
  return value !== '0';
}

export function sendSettingChange(pid: number): void {
  call(pid, 'change');
}
