//! The two Windows file dialogs for settings files, modal to floawty's main window.
use std::ffi::OsString;
use std::mem::size_of;
use std::os::windows::ffi::OsStringExt;
use std::path::PathBuf;

use windows_sys::Win32::Foundation::HWND;
use windows_sys::Win32::UI::Controls::Dialogs::{
    CommDlgExtendedError, GetOpenFileNameW, GetSaveFileNameW, OFN_EXPLORER, OFN_FILEMUSTEXIST,
    OFN_NOCHANGEDIR, OFN_OVERWRITEPROMPT, OFN_PATHMUSTEXIST, OPENFILENAMEW,
};

const PATH_CAPACITY: usize = 4096;
const FILTER: &str = "JSON (*.json)\0*.json\0";

/// The file the user picks to write; `None` when they cancel, `Err` with the dialog's error code.
pub fn save(owner: isize, default_name: &str) -> Result<Option<PathBuf>, u32> {
    run(owner, default_name, true).map(|chosen| chosen.map(with_json_extension))
}

/// The existing file the user picks to read; `None` when they cancel.
pub fn open(owner: isize) -> Result<Option<PathBuf>, u32> {
    run(owner, "", false)
}

fn wide(text: &str) -> Vec<u16> {
    text.encode_utf16().chain([0]).collect()
}

fn run(owner: isize, default_name: &str, saving: bool) -> Result<Option<PathBuf>, u32> {
    let mut path = vec![0u16; PATH_CAPACITY];
    let name = wide(default_name);
    path[..name.len()].copy_from_slice(&name);
    let filter = wide(FILTER);
    // No hook, so Windows shows its current dialog.
    let flags = OFN_EXPLORER
        | OFN_NOCHANGEDIR
        | OFN_PATHMUSTEXIST
        | if saving {
            OFN_OVERWRITEPROMPT
        } else {
            OFN_FILEMUSTEXIST
        };
    // SAFETY: all-zero is a valid empty OPENFILENAMEW; the buffers outlive the call.
    let mut dialog: OPENFILENAMEW = unsafe { std::mem::zeroed() };
    dialog.lStructSize = size_of::<OPENFILENAMEW>() as u32;
    dialog.hwndOwner = owner as HWND;
    dialog.lpstrFilter = filter.as_ptr();
    dialog.nFilterIndex = 1;
    dialog.lpstrFile = path.as_mut_ptr();
    dialog.nMaxFile = PATH_CAPACITY as u32;
    dialog.Flags = flags;
    // SAFETY: `dialog` is fully set up and points to buffers that stay alive during the call.
    let chosen = unsafe {
        if saving {
            GetSaveFileNameW(&mut dialog)
        } else {
            GetOpenFileNameW(&mut dialog)
        }
    };
    if chosen != 0 {
        let length = path
            .iter()
            .position(|&unit| unit == 0)
            .unwrap_or(path.len());
        return Ok(Some(PathBuf::from(OsString::from_wide(&path[..length]))));
    }
    // SAFETY: only reads the calling thread's last dialog error.
    match unsafe { CommDlgExtendedError() } {
        0 => Ok(None),
        code => Err(code),
    }
}

/// The save dialog's choice; a name typed without an extension gets `.json`.
fn with_json_extension(path: PathBuf) -> PathBuf {
    // The dialog's own default extension keeps only three characters (".jso").
    if path.extension().is_some() {
        return path;
    }
    path.with_extension("json")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_name_without_an_extension_gets_json_and_any_other_stays() {
        let json = |name: &str| with_json_extension(PathBuf::from(name));
        assert_eq!(json("C:/x/settings"), PathBuf::from("C:/x/settings.json"));
        assert_eq!(json("C:/x/my.settings"), PathBuf::from("C:/x/my.settings"));
        assert_eq!(json("C:/x/a.json"), PathBuf::from("C:/x/a.json"));
    }
}
