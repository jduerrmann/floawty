//! floawty's own windows on a desktop: the main window and a sign-in window it owns.
use windows_sys::core::BOOL;
use windows_sys::Win32::Foundation::{HWND, LPARAM};
use windows_sys::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetWindow, GetWindowThreadProcessId, InternalGetWindowText, IsWindowVisible,
    GW_OWNER,
};

const TITLE_MAX: usize = 128;

/// floawty's main window is the visible window with this exact title.
pub const MAIN_TITLE: &str = "floawty";

/// The handles of the windows a test can put in front; `None` while the window is not there.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct Windows {
    pub main: Option<u64>,
    pub sign_in: Option<u64>,
}

/// One top-level window as the enumeration reads it.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WindowInfo {
    pub hwnd: u64,
    pub owner: u64,
    pub visible: bool,
    pub title: String,
}

/// Picks the two windows out of a process's top-level windows.
pub fn find(windows: &[WindowInfo]) -> Windows {
    let main = windows
        .iter()
        .find(|window| window.visible && window.owner == 0 && window.title == MAIN_TITLE)
        .map(|window| window.hwnd);
    // A page's pop-up is owned by the main window too, but it has no title.
    let sign_in = main.and_then(|main| {
        let owned = |window: &&WindowInfo| window.visible && window.owner == main;
        let titled = |window: &&WindowInfo| window.title.starts_with(MAIN_TITLE);
        windows.iter().filter(owned).find(titled).map(|w| w.hwnd)
    });
    Windows { main, sign_in }
}

/// The windows of the processes `is_ours` accepts, on the calling thread's desktop.
pub fn find_on_desktop(is_ours: &dyn Fn(u32) -> bool) -> Windows {
    find(&enumerate(is_ours))
}

struct Visit<'a> {
    is_ours: &'a dyn Fn(u32) -> bool,
    found: Vec<WindowInfo>,
}

fn enumerate(is_ours: &dyn Fn(u32) -> bool) -> Vec<WindowInfo> {
    let mut visit = Visit {
        is_ours,
        found: Vec::new(),
    };
    // SAFETY: the callback only runs during this call and receives the pointer passed here.
    unsafe { EnumWindows(Some(collect), &mut visit as *mut Visit as LPARAM) };
    visit.found
}

unsafe extern "system" fn collect(hwnd: HWND, lparam: LPARAM) -> BOOL {
    // SAFETY: `lparam` is the `Visit` that `enumerate` keeps alive for the whole enumeration.
    let visit = unsafe { &mut *(lparam as *mut Visit) };
    let mut pid = 0;
    // SAFETY: plain queries about a window handle the enumeration just handed out.
    let (owner, visible) = unsafe {
        GetWindowThreadProcessId(hwnd, &mut pid);
        (GetWindow(hwnd, GW_OWNER), IsWindowVisible(hwnd) != 0)
    };
    if (visit.is_ours)(pid) {
        visit.found.push(WindowInfo {
            hwnd: hwnd as usize as u64,
            owner: owner as usize as u64,
            visible,
            title: if visible {
                title_of(hwnd)
            } else {
                String::new()
            },
        });
    }
    1
}

// Read from the window itself, without a message: hooks run inside floawty's own window procedures.
fn title_of(hwnd: HWND) -> String {
    let mut buffer = [0u16; TITLE_MAX];
    // SAFETY: the buffer outlives the call and its size is passed along.
    let length = unsafe { InternalGetWindowText(hwnd, buffer.as_mut_ptr(), TITLE_MAX as i32) };
    String::from_utf16_lossy(&buffer[..(length.max(0) as usize).min(TITLE_MAX - 1)])
}

#[cfg(test)]
mod tests {
    use super::*;

    fn window(hwnd: u64, owner: u64, visible: bool, title: &str) -> WindowInfo {
        WindowInfo {
            hwnd,
            owner,
            visible,
            title: title.to_string(),
        }
    }

    #[test]
    fn the_main_window_is_the_visible_unowned_one_titled_floawty() {
        let found = find(&[
            window(1, 0, true, "tao message window"),
            window(2, 0, true, "floawty"),
        ]);
        assert_eq!(
            found,
            Windows {
                main: Some(2),
                sign_in: None
            }
        );
    }

    #[test]
    fn a_hidden_main_window_is_not_found_and_takes_its_sign_in_window_with_it() {
        let found = find(&[
            window(2, 0, false, "floawty"),
            window(3, 2, true, "floawty – a.org"),
        ]);
        assert_eq!(
            found,
            Windows {
                main: None,
                sign_in: None
            }
        );
    }

    #[test]
    fn the_sign_in_window_is_the_visible_one_main_owns_with_a_floawty_title() {
        let found = find(&[
            window(2, 0, true, "floawty"),
            window(3, 2, true, "floawty – a.org"),
        ]);
        assert_eq!(
            found,
            Windows {
                main: Some(2),
                sign_in: Some(3)
            }
        );
    }

    #[test]
    fn a_page_popup_main_owns_is_no_sign_in_window() {
        let found = find(&[window(2, 0, true, "floawty"), window(3, 2, true, "")]);
        assert_eq!(found.sign_in, None);
    }

    #[test]
    fn a_window_another_window_owns_or_a_hidden_one_is_no_sign_in_window() {
        let found = find(&[
            window(2, 0, true, "floawty"),
            window(3, 9, true, "floawty – a.org"),
            window(4, 2, false, "floawty – b.org"),
        ]);
        assert_eq!(found.sign_in, None);
    }
}
