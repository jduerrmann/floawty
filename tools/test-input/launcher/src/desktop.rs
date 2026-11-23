//! Tells whether the launcher runs on a hidden desktop that `run` created.
use windows_sys::Win32::System::StationsAndDesktops::{
    GetThreadDesktop, GetUserObjectInformationW, HDESK, UOI_NAME,
};
use windows_sys::Win32::System::Threading::GetCurrentThreadId;

/// The desktops `run` creates are named with this prefix and the launcher's process id.
pub const TEST_DESKTOP_PREFIX: &str = "floawty-test-";

/// True only for a desktop `run` created; an unreadable name counts as not hidden.
fn is_test_desktop_name(name: Option<&str>) -> bool {
    name.is_some_and(|name| name.starts_with(TEST_DESKTOP_PREFIX))
}

/// True when this thread runs on a desktop that `run` created.
pub fn on_test_desktop() -> bool {
    // SAFETY: a plain query of the calling thread's own desktop.
    let name = unsafe { desktop_name(GetThreadDesktop(GetCurrentThreadId())) };
    is_test_desktop_name(name.as_deref())
}

/// # Safety
/// `desktop` must be a valid desktop handle or null.
unsafe fn desktop_name(desktop: HDESK) -> Option<String> {
    let mut buffer = [0u16; 256];
    let mut needed = 0;
    let size = std::mem::size_of_val(&buffer) as u32;
    let read = GetUserObjectInformationW(
        desktop,
        UOI_NAME,
        buffer.as_mut_ptr().cast(),
        size,
        &mut needed,
    );
    let length = buffer
        .iter()
        .position(|&unit| unit == 0)
        .unwrap_or(buffer.len());
    (read != 0).then(|| String::from_utf16_lossy(&buffer[..length]))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_desktop_run_created_is_a_test_desktop() {
        assert!(is_test_desktop_name(Some("floawty-test-4242")));
    }

    #[test]
    fn the_visible_desktop_and_other_names_are_not() {
        for name in ["Default", "WinSta0", "floawty-test", "xfloawty-test-1", ""] {
            assert!(!is_test_desktop_name(Some(name)), "{name:?}");
        }
    }

    #[test]
    fn an_unreadable_name_is_refused() {
        assert!(!is_test_desktop_name(None));
    }
}
