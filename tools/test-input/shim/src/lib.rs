//! DLL that answers floawty's hotkey, input, cursor, foreground, drag and process-start calls for app tests.
mod hooks;
mod input_hooks;
mod patch;

use std::ffi::c_void;
use std::path::PathBuf;
use std::sync::OnceLock;

use test_input_shared::handshake::{self, Handshake, Hook, STATE_VERSION};
use test_input_shared::process::is_process_alive;
use test_input_shared::state::{Shared, ENV_NAME};
use windows_sys::core::BOOL;
use windows_sys::Win32::Foundation::{HMODULE, TRUE};
use windows_sys::Win32::System::LibraryLoader::GetModuleFileNameW;
use windows_sys::Win32::System::SystemServices::DLL_PROCESS_ATTACH;
use windows_sys::Win32::System::Threading::GetCurrentProcessId;

use patch::{patch_main_module, ImportPatch};

/// What the hooks need: the run's shared state and the paths a child start needs.
pub(crate) struct Context {
    pub shared: Shared,
    pub shim_path: PathBuf,
    pub own_exe: String,
}

static CONTEXT: OnceLock<Context> = OnceLock::new();

pub(crate) fn context() -> Option<&'static Context> {
    CONTEXT.get()
}

/// # Safety
/// Called by the Windows loader only.
#[no_mangle]
pub unsafe extern "system" fn DllMain(
    module: HMODULE,
    reason: u32,
    _reserved: *mut c_void,
) -> BOOL {
    if reason != DLL_PROCESS_ATTACH {
        return TRUE;
    }
    BOOL::from(attach(module))
}

/// Opens the run's state, patches floawty's imports and reports back; false makes the load fail.
fn attach(module: HMODULE) -> bool {
    let Ok(name) = std::env::var(ENV_NAME) else {
        return false;
    };
    let Ok(shared) = Shared::open(&name) else {
        return false;
    };
    let version_matches = shared.header_version() == STATE_VERSION;
    let context = Context {
        shared,
        shim_path: PathBuf::from(module_path(module)),
        own_exe: module_path(std::ptr::null_mut()),
    };
    let context = CONTEXT.get_or_init(|| context);
    let patched = if version_matches {
        patch_main_module(&import_patches())
    } else {
        0
    };
    report(&context.shared, patched) && version_matches
}

fn report(shared: &Shared, patched: u32) -> bool {
    let Ok(mut guard) = shared.lock() else {
        return false;
    };
    // SAFETY: a plain query without arguments.
    let pid = unsafe { GetCurrentProcessId() };
    let report = Handshake {
        pid,
        version: STATE_VERSION,
        patched,
    };
    handshake::record(&mut guard.slots, report, &is_process_alive).is_ok()
}

fn import_patches() -> [ImportPatch; 11] {
    let patch = |hook: Hook, dll, replacement: usize| ImportPatch {
        bit: hook.bit(),
        dll,
        function: hook.name(),
        replacement,
    };
    let user32 = |hook: Hook, replacement: usize| patch(hook, "user32.dll", replacement);
    [
        user32(
            Hook::RegisterHotKey,
            hooks::register_hot_key as *const () as usize,
        ),
        user32(
            Hook::UnregisterHotKey,
            hooks::unregister_hot_key as *const () as usize,
        ),
        user32(Hook::SendInput, hooks::send_input as *const () as usize),
        patch(
            Hook::ShellExecuteW,
            "shell32.dll",
            hooks::shell_execute as *const () as usize,
        ),
        patch(
            Hook::CreateProcessW,
            "kernel32.dll",
            hooks::create_process as *const () as usize,
        ),
        user32(
            Hook::GetCursorPos,
            input_hooks::get_cursor_pos as *const () as usize,
        ),
        user32(
            Hook::GetAsyncKeyState,
            input_hooks::get_async_key_state as *const () as usize,
        ),
        user32(
            Hook::GetForegroundWindow,
            input_hooks::get_foreground_window as *const () as usize,
        ),
        user32(
            Hook::GetGUIThreadInfo,
            input_hooks::get_gui_thread_info as *const () as usize,
        ),
        user32(
            Hook::SetForegroundWindow,
            input_hooks::set_foreground_window as *const () as usize,
        ),
        user32(
            Hook::PostMessageW,
            hooks::post_message as *const () as usize,
        ),
    ]
}

/// The path of a loaded module; a null handle is the exe itself.
fn module_path(module: HMODULE) -> String {
    let mut buffer = [0u16; 2048];
    // SAFETY: the buffer length is passed along, and the call only writes into it.
    let length = unsafe { GetModuleFileNameW(module, buffer.as_mut_ptr(), buffer.len() as u32) };
    String::from_utf16_lossy(&buffer[..length as usize])
}
