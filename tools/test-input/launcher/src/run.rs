//! `run`: a command on a desktop nobody looks at, in a job, one run at a time, with a time limit.
use std::time::Duration;

use test_input_shared::process::{os_error, wide};
use windows_sys::Win32::Foundation::{CloseHandle, GetLastError, ERROR_ALREADY_EXISTS, HANDLE};
use windows_sys::Win32::System::StationsAndDesktops::{CloseDesktop, CreateDesktopW, HDESK};
use windows_sys::Win32::System::Threading::CreateMutexW;

use crate::cli::command_line;
use crate::desktop::TEST_DESKTOP_PREFIX;
use crate::job::Job;
use crate::spawn::{inherited_stdio, start_suspended};
use crate::EXIT_LAUNCHER_FAILED;

const RUN_MUTEX: &str = "Global\\floawty-app-tests";
const GENERIC_ALL: u32 = 0x1000_0000;
/// The code `timeout` of GNU coreutils uses, so callers know it from elsewhere.
const EXIT_TIMEOUT: i32 = 124;
const LONGEST_WAIT_MS: u128 = (u32::MAX - 1) as u128;

pub fn run(timeout: Duration, command: &[String]) -> i32 {
    run_command(timeout, command).unwrap_or_else(|cause| {
        eprintln!("test-input: {cause}");
        EXIT_LAUNCHER_FAILED
    })
}

fn run_command(timeout: Duration, command: &[String]) -> Result<i32, String> {
    let _only_run = SingleRun::acquire()?;
    let desktop = Desktop::create(&format!("{TEST_DESKTOP_PREFIX}{}", std::process::id()))?;
    let job = Job::new()?;
    let child = start_suspended(
        &command_line(command),
        Some(&desktop.name),
        inherited_stdio()?,
    )?;
    if let Err(cause) = job.assign(child.process) {
        child.terminate();
        return Err(cause);
    }
    child.resume();
    let milliseconds = timeout.as_millis().min(LONGEST_WAIT_MS) as u32;
    if child.wait(milliseconds) {
        return Ok(child.exit_code() as i32);
    }
    job.terminate(EXIT_TIMEOUT as u32);
    eprintln!(
        "test-input: the run took longer than {} s; every process of it was ended",
        timeout.as_secs()
    );
    Ok(EXIT_TIMEOUT)
}

/// The machine-wide name that lets only one app test run at a time.
struct SingleRun(HANDLE);

impl SingleRun {
    fn acquire() -> Result<SingleRun, String> {
        let name = wide(RUN_MUTEX);
        // SAFETY: creates a named mutex; the last error is read right after the call.
        let (handle, code) = unsafe {
            let handle = CreateMutexW(std::ptr::null(), 0, name.as_ptr());
            (handle, GetLastError())
        };
        if handle.is_null() {
            return Err(os_error("cannot create the run lock"));
        }
        let run = SingleRun(handle);
        match code == ERROR_ALREADY_EXISTS {
            true => Err("another app test run is active".to_string()),
            false => Ok(run),
        }
    }
}

impl Drop for SingleRun {
    fn drop(&mut self) {
        // SAFETY: the handle belongs to this value; the name is free once the last handle closes.
        unsafe { CloseHandle(self.0) };
    }
}

/// A desktop that is never switched to, so nothing on it reaches the screen.
struct Desktop {
    handle: HDESK,
    name: String,
}

impl Desktop {
    fn create(name: &str) -> Result<Desktop, String> {
        let wide_name = wide(name);
        // SAFETY: creates a desktop with a valid name and default security.
        let handle = unsafe {
            CreateDesktopW(
                wide_name.as_ptr(),
                std::ptr::null(),
                std::ptr::null(),
                0,
                GENERIC_ALL,
                std::ptr::null(),
            )
        };
        match handle.is_null() {
            true => Err(os_error("cannot create the hidden desktop")),
            false => Ok(Desktop {
                handle,
                name: name.to_string(),
            }),
        }
    }
}

impl Drop for Desktop {
    fn drop(&mut self) {
        // SAFETY: the handle belongs to this value.
        unsafe { CloseDesktop(self.handle) };
    }
}
