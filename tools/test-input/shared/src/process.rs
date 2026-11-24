//! Small Windows helpers both sides need: wide strings and liveness checks.
use windows_sys::Win32::Foundation::{CloseHandle, GetLastError, WAIT_TIMEOUT};
use windows_sys::Win32::System::Threading::{
    OpenProcess, WaitForSingleObject, PROCESS_SYNCHRONIZE,
};
use windows_sys::Win32::UI::WindowsAndMessaging::IsWindow;

use crate::table::Entry;

pub fn wide(text: &str) -> Vec<u16> {
    text.encode_utf16().chain(Some(0)).collect()
}

pub fn is_process_alive(pid: u32) -> bool {
    // SAFETY: the handle is opened, waited on without blocking and closed right here.
    unsafe {
        let process = OpenProcess(PROCESS_SYNCHRONIZE, 0, pid);
        if process.is_null() {
            return false;
        }
        let alive = WaitForSingleObject(process, 0) == WAIT_TIMEOUT;
        CloseHandle(process);
        alive
    }
}

/// A registration lives while its process and window do, as with Windows' own table.
pub fn entry_is_live(entry: &Entry) -> bool {
    if !is_process_alive(entry.pid) {
        return false;
    }
    // SAFETY: IsWindow only tests a handle value and accepts any.
    entry.hwnd == 0 || unsafe { IsWindow(entry.hwnd as usize as _) } != 0
}

/// The message with the Windows error of the call that just failed.
pub fn os_error(what: &str) -> String {
    // SAFETY: reads the thread's last error; callers use it right after the failed call.
    format!("{what} (error {})", unsafe { GetLastError() })
}
