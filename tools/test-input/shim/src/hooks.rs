//! The functions floawty calls instead of Windows': hotkeys, input, browser starts and child starts.
use std::ffi::c_void;

use test_input_shared::hotkey_text::Combo;
use test_input_shared::inject::load_shim;
use test_input_shared::post_message::is_drag_request;
use test_input_shared::process::entry_is_live;
use test_input_shared::process_image::is_floawty_call;
use test_input_shared::state::Counter;
use test_input_shared::table::{HotkeyError, HotkeyTable, Owner};
use windows_sys::core::{BOOL, PCWSTR, PWSTR};
use windows_sys::Win32::Foundation::{
    CloseHandle, SetLastError, ERROR_ACCESS_DENIED, ERROR_HOTKEY_ALREADY_REGISTERED,
    ERROR_HOTKEY_NOT_REGISTERED, ERROR_INVALID_FUNCTION, ERROR_NOT_ENOUGH_MEMORY, ERROR_TIMEOUT,
    HINSTANCE, HWND, LPARAM, WPARAM,
};
use windows_sys::Win32::Security::SECURITY_ATTRIBUTES;
use windows_sys::Win32::System::Threading::{
    CreateProcessW, GetCurrentProcessId, GetCurrentThreadId, ResumeThread, TerminateProcess,
    CREATE_SUSPENDED, PROCESS_INFORMATION, STARTUPINFOW,
};
use windows_sys::Win32::UI::WindowsAndMessaging::PostMessageW;

use crate::{context, Context};

/// `ShellExecuteW` reports success with a value above 32.
const SHELL_EXECUTE_OK: usize = 42;

pub extern "system" fn register_hot_key(hwnd: HWND, id: i32, mods: u32, vk: u32) -> BOOL {
    let owner = Owner {
        pid: current_process(),
        tid: current_thread(),
        hwnd: hwnd as usize as u64,
    };
    let combo = Combo::from_register(mods, vk);
    answer(table_call(|table| {
        table.register(owner, id, combo, &entry_is_live)
    }))
}

pub extern "system" fn unregister_hot_key(hwnd: HWND, id: i32) -> BOOL {
    let (hwnd, tid) = (hwnd as usize as u64, current_thread());
    answer(table_call(|table| table.unregister(hwnd, tid, id)))
}

/// Input from the tested exe must never reach the real desktop; it is counted instead.
pub extern "system" fn send_input(count: u32, _inputs: *const c_void, _size: i32) -> u32 {
    if let Some(context) = context() {
        context.shared.add(Counter::SendInput);
        // Windows lets the process that sent input take the foreground next.
        if let Ok(mut guard) = context.shared.lock() {
            guard.input.note_send_input();
        }
    }
    count
}

/// floawty asks Windows for its move loop with a posted caption press; that loop would run on a
/// desktop nobody sees, so the request is counted and dropped. Every other message is posted.
pub extern "system" fn post_message(
    hwnd: HWND,
    message: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> BOOL {
    match context().filter(|_| is_drag_request(message, wparam)) {
        Some(context) => {
            context.shared.add(Counter::Drag);
            1
        }
        // SAFETY: the real function takes the arguments floawty passed.
        None => unsafe { PostMessageW(hwnd, message, wparam, lparam) },
    }
}

/// A page's link to the browser is swallowed, never opened on the maintainer's desktop.
pub extern "system" fn shell_execute(
    _hwnd: HWND,
    _operation: PCWSTR,
    _file: PCWSTR,
    _parameters: PCWSTR,
    _directory: PCWSTR,
    _show: i32,
) -> HINSTANCE {
    if let Some(context) = context() {
        context.shared.add(Counter::ShellExecute);
    }
    SHELL_EXECUTE_OK as HINSTANCE
}

/// The arguments of one `CreateProcessW` call, so the real function can be called again with them.
struct CreateCall {
    application: PCWSTR,
    command_line: PWSTR,
    process_attributes: *const SECURITY_ATTRIBUTES,
    thread_attributes: *const SECURITY_ATTRIBUTES,
    inherit_handles: BOOL,
    environment: *const c_void,
    directory: PCWSTR,
    startup: *const STARTUPINFOW,
    info: *mut PROCESS_INFORMATION,
}

impl CreateCall {
    /// # Safety
    /// The pointers must be valid for `CreateProcessW`, as floawty passed them.
    unsafe fn start(&self, flags: u32) -> BOOL {
        CreateProcessW(
            self.application,
            self.command_line,
            self.process_attributes,
            self.thread_attributes,
            self.inherit_handles,
            flags,
            self.environment,
            self.directory,
            self.startup,
            self.info,
        )
    }

    /// # Safety
    /// `application` and `command_line` must be null or NUL-terminated UTF-16 strings.
    unsafe fn starts_floawty(&self, own_exe: &str) -> bool {
        let application = read_wide(self.application);
        let command_line = read_wide(self.command_line);
        is_floawty_call(application.as_deref(), command_line.as_deref(), own_exe)
    }
}

/// # Safety
/// Called by floawty with the arguments of `CreateProcessW`.
pub unsafe extern "system" fn create_process(
    application: PCWSTR,
    command_line: PWSTR,
    process_attributes: *const SECURITY_ATTRIBUTES,
    thread_attributes: *const SECURITY_ATTRIBUTES,
    inherit_handles: BOOL,
    flags: u32,
    environment: *const c_void,
    directory: PCWSTR,
    startup: *const STARTUPINFOW,
    info: *mut PROCESS_INFORMATION,
) -> BOOL {
    let call = CreateCall {
        application,
        command_line,
        process_attributes,
        thread_attributes,
        inherit_handles,
        environment,
        directory,
        startup,
        info,
    };
    let Some(context) = context().filter(|context| call.starts_floawty(&context.own_exe)) else {
        return call.start(flags);
    };
    if call.start(flags | CREATE_SUSPENDED) == 0 {
        return 0;
    }
    adopt_child(context, &*info, flags & CREATE_SUSPENDED != 0)
}

/// Gives a suspended floawty child the shim, and lets it run only once that worked.
///
/// # Safety
/// `child` must describe a process just created suspended, whose handles the caller has not used.
unsafe fn adopt_child(
    context: &Context,
    child: &PROCESS_INFORMATION,
    keep_suspended: bool,
) -> BOOL {
    let (shared, pid) = (&context.shared, child.dwProcessId);
    if let Err(cause) = load_shim(shared, child.hProcess, pid, &context.shim_path) {
        TerminateProcess(child.hProcess, 1);
        CloseHandle(child.hProcess);
        CloseHandle(child.hThread);
        let _ = shared.report_child_error(&format!("child {pid}: {cause}"));
        SetLastError(ERROR_ACCESS_DENIED);
        return 0;
    }
    shared.record_child(pid);
    if !keep_suspended {
        ResumeThread(child.hThread);
    }
    1
}

/// # Safety
/// `text` must be null or point to a NUL-terminated UTF-16 string.
unsafe fn read_wide(text: *const u16) -> Option<String> {
    if text.is_null() {
        return None;
    }
    let length = (0..).take_while(|offset| *text.add(*offset) != 0).count();
    Some(String::from_utf16_lossy(std::slice::from_raw_parts(
        text, length,
    )))
}

fn table_call(call: impl FnOnce(&mut HotkeyTable) -> Result<(), HotkeyError>) -> Result<(), u32> {
    let context = context().ok_or(ERROR_INVALID_FUNCTION)?;
    let mut guard = context.shared.lock().map_err(|_| ERROR_TIMEOUT)?;
    call(&mut guard.table).map_err(|error| windows_error(&error))
}

/// The error Windows reports for the same refusal.
fn windows_error(error: &HotkeyError) -> u32 {
    match error {
        HotkeyError::Taken => ERROR_HOTKEY_ALREADY_REGISTERED,
        HotkeyError::NotFound => ERROR_HOTKEY_NOT_REGISTERED,
        HotkeyError::Full => ERROR_NOT_ENOUGH_MEMORY,
    }
}

fn answer(result: Result<(), u32>) -> BOOL {
    match result {
        Ok(()) => 1,
        Err(code) => {
            // SAFETY: sets the calling thread's last error, as the real function would.
            unsafe { SetLastError(code) };
            0
        }
    }
}

fn current_process() -> u32 {
    // SAFETY: a plain query without arguments.
    unsafe { GetCurrentProcessId() }
}

fn current_thread() -> u32 {
    // SAFETY: a plain query without arguments.
    unsafe { GetCurrentThreadId() }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_refused_hotkey_reports_the_error_windows_reports() {
        assert_eq!(windows_error(&HotkeyError::Taken), 1409);
        assert_eq!(windows_error(&HotkeyError::NotFound), 1419);
    }

    #[test]
    fn a_failed_call_returns_false_with_its_error_set() {
        assert_eq!(answer(Err(ERROR_HOTKEY_ALREADY_REGISTERED)), 0);
        assert_eq!(answer(Ok(())), 1);
    }
}
