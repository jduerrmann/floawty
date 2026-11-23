//! Loads the shim into a process that has not run yet and checks its handshake before it may.
use std::ffi::c_void;
use std::path::Path;

use windows_sys::Win32::Foundation::{CloseHandle, HANDLE, WAIT_OBJECT_0};
use windows_sys::Win32::System::Diagnostics::Debug::WriteProcessMemory;
use windows_sys::Win32::System::LibraryLoader::{GetModuleHandleW, GetProcAddress};
use windows_sys::Win32::System::Memory::{
    VirtualAllocEx, VirtualFreeEx, MEM_COMMIT, MEM_RELEASE, MEM_RESERVE, PAGE_READWRITE,
};
use windows_sys::Win32::System::Threading::{
    CreateRemoteThread, GetExitCodeThread, WaitForSingleObject,
};

use crate::handshake::{self, STATE_VERSION};
use crate::process::{os_error, wide};
use crate::state::Shared;

const LOAD_TIMEOUT_MS: u32 = 10_000;

type ThreadStart = unsafe extern "system" fn(*mut c_void) -> u32;

/// Injects the shim with a remote `LoadLibraryW` and accepts the process only on a complete handshake.
pub fn load_shim(shared: &Shared, process: HANDLE, pid: u32, dll: &Path) -> Result<(), String> {
    handshake::clear(&mut shared.lock()?.slots, pid);
    let loaded = run_load_library(process, dll)?;
    let report = handshake::find(&shared.lock()?.slots, pid);
    match handshake::check(STATE_VERSION, report) {
        Ok(()) => Ok(()),
        Err(cause) if loaded || report.is_some() => Err(cause),
        Err(cause) => Err(format!(
            "the shim DLL did not load (a blocked, missing or refused DLL): {cause}"
        )),
    }
}

/// Returns whether `LoadLibraryW` gave a module back.
fn run_load_library(process: HANDLE, dll: &Path) -> Result<bool, String> {
    let path = wide(&dll.to_string_lossy());
    let bytes = path.len() * 2;
    // SAFETY: the memory is allocated in the target, filled once and freed after the thread ended.
    unsafe {
        let remote = VirtualAllocEx(
            process,
            std::ptr::null(),
            bytes,
            MEM_COMMIT | MEM_RESERVE,
            PAGE_READWRITE,
        );
        if remote.is_null() {
            return Err(os_error("cannot allocate memory in the new process"));
        }
        let written = WriteProcessMemory(
            process,
            remote,
            path.as_ptr().cast(),
            bytes,
            std::ptr::null_mut(),
        );
        if written == 0 {
            return Err(os_error("cannot write the shim path into the new process"));
        }
        let outcome = wait_for_load(process, remote);
        if outcome.is_ok() {
            VirtualFreeEx(process, remote, 0, MEM_RELEASE);
        }
        outcome
    }
}

/// # Safety
/// `remote` must hold the NUL-terminated wide path of the DLL inside `process`.
unsafe fn wait_for_load(process: HANDLE, remote: *mut c_void) -> Result<bool, String> {
    let kernel32 = GetModuleHandleW(wide("kernel32.dll").as_ptr());
    let Some(load_library) = GetProcAddress(kernel32, c"LoadLibraryW".as_ptr().cast()) else {
        return Err(os_error("cannot find LoadLibraryW"));
    };
    // SAFETY: LoadLibraryW takes one pointer and returns a pointer-sized value; the low half is read.
    let start: ThreadStart = std::mem::transmute(load_library);
    let thread = CreateRemoteThread(
        process,
        std::ptr::null(),
        0,
        Some(start),
        remote,
        0,
        std::ptr::null_mut(),
    );
    if thread.is_null() {
        return Err(os_error(
            "cannot start the loader thread in the new process",
        ));
    }
    let finished = WaitForSingleObject(thread, LOAD_TIMEOUT_MS) == WAIT_OBJECT_0;
    let mut module_low = 0;
    GetExitCodeThread(thread, &mut module_low);
    CloseHandle(thread);
    match finished {
        true => Ok(module_low != 0),
        false => Err(format!(
            "the shim did not finish loading within {} s",
            LOAD_TIMEOUT_MS / 1000
        )),
    }
}
