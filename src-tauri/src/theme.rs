//! floawty's own light or dark: the pages' startup script and window mode's title bar.
//! Never Tauri's theme API: it would recolour the profile all services share.
use tauri::window::Color;
use tauri::{AppHandle, Manager};
use windows_sys::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};

use crate::logbook;
use crate::overlay::{self, Overlay};
use crate::settings::Theme;

// The root element does not exist yet when the script runs; a reload keeps the latest choice.
const STARTUP: &str = "(() => {
  const theme = sessionStorage.getItem('theme') ?? THEME;
  const apply = () => {
    if (!document.documentElement) return false;
    document.documentElement.dataset.theme = theme;
    return true;
  };
  if (apply()) return;
  new MutationObserver((_, watch) => {
    if (apply()) watch.disconnect();
  }).observe(document, { childList: true });
})();";
const SUBCLASS_ID: usize = 1;
// Windows 10 before build 18985 knows the attribute by 19.
const DARK_TITLE_BAR_BEFORE_18985: u32 = 19;

/// Runs in floawty's own pages before their first paint.
pub fn startup_script(theme: Theme) -> String {
    let name = serde_json::to_string(&theme).expect("a theme always serializes");
    STARTUP.replace("THEME", &name)
}

fn forced_dark(theme: Theme) -> Option<bool> {
    match theme {
        Theme::System => None,
        Theme::Light => Some(false),
        Theme::Dark => Some(true),
    }
}

fn title_bar_dark(theme: Theme, windows_dark: bool) -> bool {
    forced_dark(theme).unwrap_or(windows_dark)
}

/// Under a service until its page draws: `--ground-1` of floawty's own pages, never white.
pub fn ground(app: &AppHandle) -> Color {
    let theme = app.state::<Overlay>().settings().theme;
    let windows_dark = overlay::main_window(app)
        .theme()
        .is_ok_and(|theme| theme == tauri::Theme::Dark);
    ground_colour(title_bar_dark(theme, windows_dark))
}

fn ground_colour(dark: bool) -> Color {
    if dark {
        Color(0x0f, 0x12, 0x26, 0xff)
    } else {
        Color(0xec, 0xef, 0xfa, 0xff)
    }
}

/// Colours the main window's title bar and keeps it so; main thread only.
pub fn apply(app: &AppHandle, theme: Theme) {
    if let Err(error) = colour_title_bar(app, theme) {
        logbook::write(app, &format!("could not colour the title bar: {error}"));
    }
}

fn colour_title_bar(app: &AppHandle, theme: Theme) -> tauri::Result<()> {
    use windows_sys::Win32::UI::Shell::SetWindowSubclass;
    let window = overlay::main_window(app);
    let windows_dark = window.theme()? == tauri::Theme::Dark;
    let hwnd = window.hwnd()?.0 as HWND;
    // SAFETY: our own live window, on the thread that owns it; the same id replaces the data.
    unsafe {
        if SetWindowSubclass(hwnd, Some(keep_colour), SUBCLASS_ID, theme as usize) == 0 {
            logbook::write(
                app,
                "could not keep the title bar's colour over setting changes",
            );
        }
        set_dark(hwnd, title_bar_dark(theme, windows_dark));
        // Drawn by hand, a frameless window would get a caption painted into it.
        if window.is_decorated()? {
            redraw(hwnd);
        }
    }
    Ok(())
}

// tao rewrites the colour after every Windows setting change, so a chosen one is set again.
// No Tauri in here: it would re-enter the event loop.
unsafe extern "system" fn keep_colour(
    hwnd: HWND,
    message: u32,
    wparam: WPARAM,
    lparam: LPARAM,
    _id: usize,
    chosen: usize,
) -> LRESULT {
    use windows_sys::Win32::UI::Shell::{DefSubclassProc, RemoveWindowSubclass};
    use windows_sys::Win32::UI::WindowsAndMessaging::{WM_NCDESTROY, WM_SETTINGCHANGE};
    let result = DefSubclassProc(hwnd, message, wparam, lparam);
    if message == WM_SETTINGCHANGE {
        let forced = [Theme::Light, Theme::Dark]
            .into_iter()
            .find(|theme| *theme as usize == chosen)
            .and_then(forced_dark);
        if let Some(dark) = forced {
            set_dark(hwnd, dark);
        }
    }
    if message == WM_NCDESTROY {
        RemoveWindowSubclass(hwnd, Some(keep_colour), SUBCLASS_ID);
    }
    result
}

unsafe fn set_dark(hwnd: HWND, dark: bool) {
    use windows_sys::Win32::Graphics::Dwm::{DwmSetWindowAttribute, DWMWA_USE_IMMERSIVE_DARK_MODE};
    let value = i32::from(dark);
    let set = |attribute: u32| {
        DwmSetWindowAttribute(
            hwnd,
            attribute,
            (&raw const value).cast(),
            std::mem::size_of::<i32>() as u32,
        )
    };
    if set(DWMWA_USE_IMMERSIVE_DARK_MODE as u32) < 0 {
        set(DARK_TITLE_BAR_BEFORE_18985);
    }
}

// Windows repaints a title bar only when its active state changes.
unsafe fn redraw(hwnd: HWND) {
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::GetActiveWindow;
    use windows_sys::Win32::UI::WindowsAndMessaging::{DefWindowProcW, WM_NCACTIVATE};
    let active = GetActiveWindow() == hwnd;
    DefWindowProcW(hwnd, WM_NCACTIVATE, usize::from(!active), 0);
    DefWindowProcW(hwnd, WM_NCACTIVATE, usize::from(active), 0);
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::settings::Theme;

    fn hex(Color(r, g, b, _): Color) -> String {
        format!("#{r:02x}{g:02x}{b:02x}")
    }

    #[test]
    fn the_ground_under_a_service_matches_the_pages_ground() {
        let tokens = include_str!("../../src/tokens.css");
        let (light, dark) = (hex(ground_colour(false)), hex(ground_colour(true)));
        assert!(tokens.contains(&format!("--ground-1: light-dark({light}, {dark});")));
    }

    #[test]
    fn only_a_chosen_theme_overrides_windows() {
        assert_eq!(forced_dark(Theme::System), None);
        assert_eq!(forced_dark(Theme::Light), Some(false));
        assert_eq!(forced_dark(Theme::Dark), Some(true));
    }

    #[test]
    fn the_title_bar_follows_the_choice_and_else_windows() {
        for windows_dark in [false, true] {
            assert!(!title_bar_dark(Theme::Light, windows_dark));
            assert!(title_bar_dark(Theme::Dark, windows_dark));
            assert_eq!(title_bar_dark(Theme::System, windows_dark), windows_dark);
        }
    }

    #[test]
    fn the_startup_script_names_the_theme_and_waits_for_the_root_element() {
        for (theme, name) in [
            (Theme::System, r#""system""#),
            (Theme::Light, r#""light""#),
            (Theme::Dark, r#""dark""#),
        ] {
            let script = startup_script(theme);
            assert!(script.contains(name), "{script}");
            assert!(script.contains("MutationObserver"), "{script}");
        }
    }
}
