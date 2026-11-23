//! A job object that ends every process in it when the launcher goes away.
use std::ffi::c_void;

use test_input_shared::process::os_error;
use windows_sys::Win32::Foundation::{CloseHandle, HANDLE};
use windows_sys::Win32::System::JobObjects::{
    AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation,
    SetInformationJobObject, TerminateJobObject, JOBOBJECT_EXTENDED_LIMIT_INFORMATION,
    JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
};

pub struct Job(HANDLE);

impl Job {
    /// The handle is not inheritable, so no child can keep the job alive.
    pub fn new() -> Result<Job, String> {
        // SAFETY: creates an unnamed job; the handle is closed in Drop.
        let handle = unsafe { CreateJobObjectW(std::ptr::null(), std::ptr::null()) };
        if handle.is_null() {
            return Err(os_error("cannot create the job object"));
        }
        let job = Job(handle);
        // SAFETY: a zeroed limit structure is valid; only the kill-on-close flag is set.
        let mut limits: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = unsafe { std::mem::zeroed() };
        limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        let size = std::mem::size_of_val(&limits) as u32;
        // SAFETY: the pointer and size describe `limits`, which lives through the call.
        let set = unsafe {
            SetInformationJobObject(
                handle,
                JobObjectExtendedLimitInformation,
                std::ptr::addr_of!(limits).cast::<c_void>(),
                size,
            )
        };
        if set == 0 {
            return Err(os_error("cannot make the job end its processes on close"));
        }
        Ok(job)
    }

    pub fn assign(&self, process: HANDLE) -> Result<(), String> {
        // SAFETY: both handles are valid; the process was started suspended.
        match unsafe { AssignProcessToJobObject(self.0, process) } {
            0 => Err(os_error("cannot put the process into the job")),
            _ => Ok(()),
        }
    }

    pub fn terminate(&self, exit_code: u32) {
        // SAFETY: ends every process of the job; the handle is valid.
        unsafe { TerminateJobObject(self.0, exit_code) };
    }
}

impl Drop for Job {
    fn drop(&mut self) {
        // SAFETY: the handle belongs to this value; closing it ends the job's processes.
        unsafe { CloseHandle(self.0) };
    }
}
