//! The cursor, mouse-button and foreground calls, answered from what the test set.
use test_input_shared::input::{front_window, is_button_key, target_of, Input};
use test_input_shared::windows::{find_on_desktop, Windows};
use windows_sys::core::BOOL;
use windows_sys::Win32::Foundation::{
    SetLastError, ERROR_ACCESS_DENIED, ERROR_TIMEOUT, HWND, POINT,
};
use windows_sys::Win32::System::Threading::GetCurrentProcessId;
use windows_sys::Win32::UI::Input::KeyboardAndMouse::GetAsyncKeyState;
use windows_sys::Win32::UI::WindowsAndMessaging::{
    GetAncestor, GetCursorPos, GetDesktopWindow, GetForegroundWindow, GetGUIThreadInfo,
    SetForegroundWindow, GA_ROOT, GUITHREADINFO,
};

use crate::{context, Context};

fn read_input(context: &Context) -> Result<Input, u32> {
    context
        .shared
        .lock()
        .map(|guard| guard.input)
        .map_err(|_| ERROR_TIMEOUT)
}

fn floawty_windows() -> Windows {
    // SAFETY: a plain query without arguments.
    let own = unsafe { GetCurrentProcessId() };
    find_on_desktop(&|pid| pid == own)
}

/// The window in front, or none; "other" is a real window that is not floawty's.
fn front_of(context: &Context) -> Option<u64> {
    let input = read_input(context).ok()?;
    // SAFETY: a plain query without arguments.
    let other = unsafe { GetDesktopWindow() } as usize as u64;
    front_window(input.foreground(), &floawty_windows, other)
}

/// Off the input desktop Windows refuses the cursor with "access denied", and so does an unset one.
fn cursor_of(input: Input) -> Result<(i32, i32), u32> {
    input.cursor().ok_or(ERROR_ACCESS_DENIED)
}

/// # Safety
/// Called by floawty with a valid `POINT` pointer, as `GetCursorPos` requires.
pub unsafe extern "system" fn get_cursor_pos(point: *mut POINT) -> BOOL {
    let Some(context) = context().filter(|_| !point.is_null()) else {
        return GetCursorPos(point);
    };
    match read_input(context).and_then(cursor_of) {
        Ok((x, y)) => {
            point.write(POINT { x, y });
            1
        }
        Err(code) => {
            SetLastError(code);
            0
        }
    }
}

/// Only the mouse buttons come from the test; every other key is the real keyboard's.
pub extern "system" fn get_async_key_state(vkey: i32) -> i16 {
    let Some(context) = context().filter(|_| is_button_key(vkey)) else {
        // SAFETY: the real function takes any key code.
        return unsafe { GetAsyncKeyState(vkey) };
    };
    let input = read_input(context).unwrap_or_default();
    input.async_key(vkey).unwrap_or(0)
}

pub extern "system" fn get_foreground_window() -> HWND {
    let Some(context) = context() else {
        // SAFETY: a plain query without arguments.
        return unsafe { GetForegroundWindow() };
    };
    front_of(context).map_or(std::ptr::null_mut(), |hwnd| hwnd as usize as HWND)
}

fn thread_info_of(hwnd: u64) -> GUITHREADINFO {
    // SAFETY: GUITHREADINFO holds integers and handles, for which all zero is valid.
    let mut info: GUITHREADINFO = unsafe { std::mem::zeroed() };
    info.cbSize = std::mem::size_of::<GUITHREADINFO>() as u32;
    // Focus is never in the bar; it is in whatever window is in front.
    info.hwndActive = hwnd as usize as HWND;
    info.hwndFocus = hwnd as usize as HWND;
    info
}

/// # Safety
/// Called by floawty with a valid `GUITHREADINFO` pointer, as `GetGUIThreadInfo` requires.
pub unsafe extern "system" fn get_gui_thread_info(thread: u32, info: *mut GUITHREADINFO) -> BOOL {
    let size = std::mem::size_of::<GUITHREADINFO>() as u32;
    let ours = thread == 0 && !info.is_null() && (*info).cbSize == size;
    let Some(context) = context().filter(|_| ours) else {
        return GetGUIThreadInfo(thread, info);
    };
    match front_of(context) {
        Some(hwnd) => {
            info.write(thread_info_of(hwnd));
            1
        }
        None => {
            SetLastError(ERROR_ACCESS_DENIED);
            0
        }
    }
}

pub extern "system" fn set_foreground_window(hwnd: HWND) -> BOOL {
    let Some(context) = context() else {
        // SAFETY: the real function accepts any handle value.
        return unsafe { SetForegroundWindow(hwnd) };
    };
    // SAFETY: only asks which window is the root of a handle value.
    let root = unsafe { GetAncestor(hwnd, GA_ROOT) } as usize as u64;
    let target = target_of(&floawty_windows(), root);
    let granted = match context.shared.lock() {
        Ok(mut guard) => guard.input.request_foreground(target),
        Err(_) => false,
    };
    if !granted {
        // SAFETY: sets the calling thread's last error, as the real function would.
        unsafe { SetLastError(ERROR_ACCESS_DENIED) };
    }
    BOOL::from(granted)
}

#[cfg(test)]
mod tests {
    use super::*;
    use test_input_shared::input::{Button, Foreground};

    #[test]
    fn an_unset_cursor_fails_with_access_denied_and_a_set_one_answers() {
        let mut input = Input::default();
        assert_eq!(cursor_of(input), Err(ERROR_ACCESS_DENIED));
        input.set_cursor(Some((-3, 40)));
        assert_eq!(cursor_of(input), Ok((-3, 40)));
    }

    #[test]
    fn the_thread_info_names_the_window_in_front_as_active_and_focused() {
        let info = thread_info_of(0x1234);
        assert_eq!(info.cbSize as usize, std::mem::size_of::<GUITHREADINFO>());
        assert_eq!(info.hwndActive as usize, 0x1234);
        assert_eq!(info.hwndFocus as usize, 0x1234);
        assert!(info.hwndCapture.is_null() && info.flags == 0);
    }

    #[test]
    fn mouse_buttons_come_from_the_state_and_other_keys_are_not_answered() {
        let mut input = Input::default();
        input.set_button(Button::Right, true);
        assert!(is_button_key(0x02) && is_button_key(0x01));
        assert_eq!(input.async_key(0x02), Some(i16::MIN));
        assert!(!is_button_key(0x41));
        assert_eq!(input.foreground(), Foreground::Main);
    }
}
