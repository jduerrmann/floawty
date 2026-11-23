//! Starts a process suspended with exactly the standard handles it should inherit.
use std::ffi::c_void;

use test_input_shared::process::wide;
use windows_sys::Win32::Foundation::{
    CloseHandle, HANDLE, HANDLE_FLAG_INHERIT, INVALID_HANDLE_VALUE, WAIT_OBJECT_0,
};
use windows_sys::Win32::Security::SECURITY_ATTRIBUTES;
use windows_sys::Win32::Storage::FileSystem::{
    CreateFileW, FILE_SHARE_READ, FILE_SHARE_WRITE, OPEN_EXISTING,
};
use windows_sys::Win32::System::Console::{
    GetStdHandle, STD_ERROR_HANDLE, STD_INPUT_HANDLE, STD_OUTPUT_HANDLE,
};
use windows_sys::Win32::System::Threading::{
    CreateProcessW, DeleteProcThreadAttributeList, GetExitCodeProcess,
    InitializeProcThreadAttributeList, ResumeThread, TerminateProcess, UpdateProcThreadAttribute,
    WaitForSingleObject, CREATE_SUSPENDED, EXTENDED_STARTUPINFO_PRESENT,
    LPPROC_THREAD_ATTRIBUTE_LIST, PROCESS_INFORMATION, PROC_THREAD_ATTRIBUTE_HANDLE_LIST,
    STARTF_USESTDHANDLES, STARTUPINFOEXW,
};

use test_input_shared::process::os_error;

const GENERIC_READ_WRITE: u32 = 0xC000_0000;

/// The standard handles a started process gets.
#[derive(Clone, Copy)]
pub struct Stdio {
    pub input: HANDLE,
    pub output: HANDLE,
    pub error: HANDLE,
}

/// The launcher's own standard handles, so the command's output and input pass through.
pub fn inherited_stdio() -> Result<Stdio, String> {
    Ok(Stdio {
        input: std_or_nul(STD_INPUT_HANDLE)?,
        output: std_or_nul(STD_OUTPUT_HANDLE)?,
        error: std_or_nul(STD_ERROR_HANDLE)?,
    })
}

/// No input and no output, so floawty can never write into the protocol channel; errors go to stderr.
pub fn floawty_stdio() -> Result<Stdio, String> {
    Ok(Stdio {
        input: nul()?,
        output: nul()?,
        error: std_or_nul(STD_ERROR_HANDLE)?,
    })
}

fn std_or_nul(which: u32) -> Result<HANDLE, String> {
    // SAFETY: only reads the process's standard handle.
    let handle = unsafe { GetStdHandle(which) };
    let usable = !handle.is_null() && handle != INVALID_HANDLE_VALUE;
    // SAFETY: marks a handle of this process inheritable so the handle list may name it.
    if usable
        && unsafe {
            windows_sys::Win32::Foundation::SetHandleInformation(
                handle,
                HANDLE_FLAG_INHERIT,
                HANDLE_FLAG_INHERIT,
            )
        } != 0
    {
        return Ok(handle);
    }
    nul()
}

fn nul() -> Result<HANDLE, String> {
    let attributes = SECURITY_ATTRIBUTES {
        nLength: std::mem::size_of::<SECURITY_ATTRIBUTES>() as u32,
        lpSecurityDescriptor: std::ptr::null_mut(),
        bInheritHandle: 1,
    };
    // SAFETY: opens the NUL device with a valid name and attributes.
    let handle = unsafe {
        CreateFileW(
            wide("NUL").as_ptr(),
            GENERIC_READ_WRITE,
            FILE_SHARE_READ | FILE_SHARE_WRITE,
            &attributes,
            OPEN_EXISTING,
            0,
            std::ptr::null_mut(),
        )
    };
    match handle == INVALID_HANDLE_VALUE {
        true => Err(os_error("cannot open NUL")),
        false => Ok(handle),
    }
}

pub struct Child {
    pub process: HANDLE,
    thread: HANDLE,
    pub pid: u32,
}

impl Child {
    pub fn resume(&self) {
        // SAFETY: the thread handle belongs to this child.
        unsafe { ResumeThread(self.thread) };
    }

    /// Waits for the process to end; false when the time ran out first.
    pub fn wait(&self, milliseconds: u32) -> bool {
        // SAFETY: waits on the process handle of this child.
        unsafe { WaitForSingleObject(self.process, milliseconds) == WAIT_OBJECT_0 }
    }

    /// Ends a child that never got into its job.
    pub fn terminate(&self) {
        // SAFETY: the process handle belongs to this child.
        unsafe { TerminateProcess(self.process, 1) };
    }

    pub fn exit_code(&self) -> u32 {
        let mut code = 0;
        // SAFETY: the out pointer is valid for the call.
        unsafe { GetExitCodeProcess(self.process, &mut code) };
        code
    }
}

impl Drop for Child {
    fn drop(&mut self) {
        // SAFETY: both handles belong to this value.
        unsafe {
            CloseHandle(self.thread);
            CloseHandle(self.process);
        }
    }
}

/// Starts the command line suspended, on a named desktop or the caller's own.
pub fn start_suspended(
    command_line: &str,
    desktop: Option<&str>,
    stdio: Stdio,
) -> Result<Child, String> {
    let mut handles = vec![stdio.input, stdio.output, stdio.error];
    handles.sort_by_key(|handle| *handle as usize);
    handles.dedup();
    let mut attributes = AttributeList::with_handles(&handles)?;
    let mut desktop = desktop.map(wide);
    let info = startup_info(stdio, desktop.as_mut(), &mut attributes);
    let created = create_suspended(command_line, &info)?;
    Ok(Child {
        process: created.hProcess,
        thread: created.hThread,
        pid: created.dwProcessId,
    })
}

fn startup_info(
    stdio: Stdio,
    desktop: Option<&mut Vec<u16>>,
    attributes: &mut AttributeList,
) -> STARTUPINFOEXW {
    let mut info: STARTUPINFOEXW = unsafe_zeroed();
    info.StartupInfo.cb = std::mem::size_of::<STARTUPINFOEXW>() as u32;
    info.StartupInfo.dwFlags = STARTF_USESTDHANDLES;
    info.StartupInfo.hStdInput = stdio.input;
    info.StartupInfo.hStdOutput = stdio.output;
    info.StartupInfo.hStdError = stdio.error;
    info.StartupInfo.lpDesktop = desktop.map_or(std::ptr::null_mut(), |name| name.as_mut_ptr());
    info.lpAttributeList = attributes.pointer();
    info
}

fn create_suspended(
    command_line: &str,
    info: &STARTUPINFOEXW,
) -> Result<PROCESS_INFORMATION, String> {
    let mut command = wide(command_line);
    let mut created: PROCESS_INFORMATION = unsafe_zeroed();
    // SAFETY: every pointer stays valid through the call; the handle list limits what is inherited.
    let started = unsafe {
        CreateProcessW(
            std::ptr::null(),
            command.as_mut_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            1,
            CREATE_SUSPENDED | EXTENDED_STARTUPINFO_PRESENT,
            std::ptr::null(),
            std::ptr::null(),
            &info.StartupInfo,
            &mut created,
        )
    };
    match started {
        0 => Err(os_error(&format!("cannot start {command_line}"))),
        _ => Ok(created),
    }
}

fn unsafe_zeroed<T>() -> T {
    // SAFETY: only used for plain Win32 structs that are valid when all zero.
    unsafe { std::mem::zeroed() }
}

/// A process attribute list naming the handles the child may inherit.
struct AttributeList {
    buffer: Vec<u8>,
}

impl AttributeList {
    fn with_handles(handles: &[HANDLE]) -> Result<Self, String> {
        let mut size = 0;
        // SAFETY: the first call only asks how large the list must be and fails by design.
        unsafe { InitializeProcThreadAttributeList(std::ptr::null_mut(), 1, 0, &mut size) };
        let mut buffer = vec![0u8; size];
        // SAFETY: the buffer has the size the first call asked for.
        if unsafe { InitializeProcThreadAttributeList(buffer.as_mut_ptr().cast(), 1, 0, &mut size) }
            == 0
        {
            return Err(os_error("cannot prepare the handle list"));
        }
        let mut list = AttributeList { buffer };
        // SAFETY: the handle array outlives the process creation that reads it.
        let updated = unsafe {
            UpdateProcThreadAttribute(
                list.pointer(),
                0,
                PROC_THREAD_ATTRIBUTE_HANDLE_LIST as usize,
                handles.as_ptr().cast::<c_void>(),
                std::mem::size_of_val(handles),
                std::ptr::null_mut(),
                std::ptr::null(),
            )
        };
        match updated {
            0 => Err(os_error("cannot set the handle list")),
            _ => Ok(list),
        }
    }

    fn pointer(&mut self) -> LPPROC_THREAD_ATTRIBUTE_LIST {
        self.buffer.as_mut_ptr().cast()
    }
}

impl Drop for AttributeList {
    fn drop(&mut self) {
        // SAFETY: the list was initialised in with_handles before any value existed.
        unsafe { DeleteProcThreadAttributeList(self.pointer()) };
    }
}
