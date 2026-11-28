//! Only one floawty per data folder: a named mutex decides, a named event wakes the first one.
use std::ffi::OsString;
use std::path::{Path, PathBuf};
use std::ptr::null;
use std::sync::Mutex;

use tauri::{AppHandle, Manager};
use windows_sys::Win32::Foundation::{
    CloseHandle, GetLastError, ERROR_ALREADY_EXISTS, HANDLE, WAIT_OBJECT_0,
};
use windows_sys::Win32::System::Threading::{
    CreateEventW, CreateMutexW, OpenEventW, SetEvent, WaitForSingleObject, EVENT_MODIFY_STATE,
    INFINITE,
};
use windows_sys::Win32::UI::WindowsAndMessaging::{AllowSetForegroundWindow, ASFW_ANY};

use crate::{logbook, overlay};

/// FNV-1a, 64 bit: a short, stable name for a folder.
fn fnv1a(text: &str) -> u64 {
    text.bytes().fold(0xcbf2_9ce4_8422_2325, |hash, byte| {
        (hash ^ u64::from(byte)).wrapping_mul(0x0100_0000_01b3)
    })
}

/// The mutex and event names of one data folder; the same folder in any letter case matches.
fn names(folder: &Path) -> (String, String) {
    let hash = fnv1a(&folder.to_string_lossy().to_lowercase());
    let mutex = format!(r"Local\floawty-{hash:016x}");
    let event = format!("{mutex}-show");
    (mutex, event)
}

/// `FLOAWTY_DATA_DIR` wins; else `%APPDATA%\floawty`, which is Tauri's `data_dir()` plus the
/// name on Windows, the folder `paths::floawty_dir` uses.
fn data_folder(env_dir: Option<OsString>, appdata: Option<OsString>) -> Option<PathBuf> {
    env_dir
        .map(PathBuf::from)
        .or_else(|| appdata.map(|dir| PathBuf::from(dir).join("floawty")))
}

fn wide(text: &str) -> Vec<u16> {
    text.encode_utf16().chain(Some(0)).collect()
}

/// Holds the mutex for the whole run and the event that wakes this floawty for a second start.
/// Handles are kept as numbers: a raw handle is not `Send`.
pub struct Guard {
    mutex: Mutex<Option<usize>>,
    /// Open until the process ends: another thread waits on it, so it is never closed earlier.
    show: usize,
}

impl Guard {
    fn show_event(&self) -> Option<usize> {
        Some(self.show).filter(|&show| show != 0)
    }

    fn release(&self) {
        if let Some(mutex) = self.mutex.lock().unwrap().take() {
            // SAFETY: closes the mutex handle this guard created and owned until now.
            unsafe { CloseHandle(mutex as HANDLE) };
        }
    }
}

impl Drop for Guard {
    fn drop(&mut self) {
        self.release();
    }
}

/// A second start wakes the first floawty and ends right here, without a window or a log line.
pub fn claim() -> Guard {
    let unguarded = Guard {
        mutex: Mutex::new(None),
        show: 0,
    };
    let Some(folder) = data_folder(
        std::env::var_os("FLOAWTY_DATA_DIR"),
        std::env::var_os("APPDATA"),
    ) else {
        return unguarded;
    };
    let (mutex_name, event_name) = names(&folder);
    let (mutex_wide, event_wide) = (wide(&mutex_name), wide(&event_name));
    // SAFETY: plain Win32 calls with null security attributes and a terminated name.
    let mutex = unsafe { CreateMutexW(null(), 0, mutex_wide.as_ptr()) };
    if mutex.is_null() {
        return unguarded;
    }
    // SAFETY: reads the error of the call just made.
    if unsafe { GetLastError() } == ERROR_ALREADY_EXISTS {
        wake_first(&event_wide);
        std::process::exit(0);
    }
    // SAFETY: as above; an auto-reset event that starts unsignaled.
    let show = unsafe { CreateEventW(null(), 0, 0, event_wide.as_ptr()) };
    Guard {
        mutex: Mutex::new(Some(mutex as usize)),
        show: show as usize,
    }
}

fn wake_first(event_name: &[u16]) {
    // SAFETY: opens the first floawty's event, signals it and closes our handle again.
    unsafe {
        let show = OpenEventW(EVENT_MODIFY_STATE, 0, event_name.as_ptr());
        if !show.is_null() {
            // The first floawty may then take the foreground, which only we have right now.
            AllowSetForegroundWindow(ASFW_ANY);
            SetEvent(show);
            CloseHandle(show);
        }
    }
}

/// floawty's own restarts give the folder back, so the new process is the first one.
pub fn release(app: &AppHandle) {
    app.state::<Guard>().release();
}

/// One thread waits for second starts and brings the window forward for each.
pub fn listen(app: &AppHandle) {
    let Some(show) = app.state::<Guard>().show_event() else {
        return;
    };
    let app = app.clone();
    std::thread::spawn(move || {
        // SAFETY: waits on the event the guard keeps open until the process ends.
        while unsafe { WaitForSingleObject(show as HANDLE, INFINITE) } == WAIT_OBJECT_0 {
            let handle = app.clone();
            let _ = app.run_on_main_thread(move || bring_to_front(&handle));
        }
    });
}

fn bring_to_front(app: &AppHandle) {
    let window = overlay::main_window(app);
    let shown = (|| {
        if !window.is_visible()? {
            overlay::toggle_visible(app)?;
        }
        if window.is_minimized()? {
            window.unminimize()?;
        }
        window.set_focus()
    })();
    match shown {
        Ok(()) => logbook::write(app, "a second start brought floawty to the front"),
        Err(error) => logbook::write(app, &format!("could not bring floawty forward: {error}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_same_folder_in_another_case_has_the_same_names() {
        assert_eq!(
            names(Path::new(r"C:\Users\Ann\AppData\Roaming\floawty")),
            names(Path::new(r"c:\users\ann\appdata\roaming\FLOAWTY"))
        );
    }

    #[test]
    fn another_folder_has_other_names() {
        assert_ne!(
            names(Path::new(r"C:\Users\Ann\AppData\Roaming\floawty")),
            names(Path::new(r"C:\Temp\floawty-test-1"))
        );
    }

    #[test]
    fn the_names_are_local_and_the_event_has_a_suffix() {
        let (mutex, event) = names(Path::new(r"C:\data"));
        assert!(mutex.starts_with(r"Local\floawty-"));
        assert_eq!(event, format!("{mutex}-show"));
        assert_eq!(mutex.len(), r"Local\floawty-".len() + 16);
    }

    #[test]
    fn the_data_dir_variable_wins_over_appdata() {
        let folder = data_folder(Some(r"D:\tests\one".into()), Some(r"C:\Roaming".into()));
        assert_eq!(folder, Some(PathBuf::from(r"D:\tests\one")));
    }

    #[test]
    fn without_the_variable_the_folder_is_floawty_in_appdata() {
        let folder = data_folder(None, Some(r"C:\Roaming".into()));
        assert_eq!(folder, Some(Path::new(r"C:\Roaming").join("floawty")));
    }

    #[test]
    fn without_any_variable_there_is_no_folder() {
        assert_eq!(data_folder(None, None), None);
    }
}
