//! The bar: floawty's controls in a transparent webview on top of the service.
//! Over a service it shows on hover; on the tiles and in the settings it stays.
use std::sync::atomic::{AtomicBool, AtomicIsize, Ordering};
use std::sync::OnceLock;
use std::thread::{self, Thread};
use std::time::{Duration, Instant};

use tauri::{
    AppHandle, Emitter, EventTarget, LogicalPosition, LogicalSize, Manager, Webview,
    WebviewBuilder, WebviewUrl,
};
use windows_sys::Win32::Foundation::HWND;

use crate::hover::{Hover, Sample};
use crate::overlay::{self, Overlay, OverlayState};
use crate::service;

const LABEL: &str = "bar";
pub const HEIGHT: f64 = 40.0;
// The service page is another process, so its mouse moves never reach floawty; a slow look at
// the cursor while a service is open is the only way to notice hovering.
const LOOK_INTERVAL: Duration = Duration::from_millis(100);

#[derive(Default)]
pub struct Bar {
    /// Hover decides only while a service is visible and can be clicked.
    hover_applies: AtomicBool,
    hovered: AtomicBool,
    visible: AtomicBool,
    /// The bar's own window handle, to tell "over the bar" from "over the video".
    host: AtomicIsize,
    watcher: OnceLock<Thread>,
}

fn bar_state(app: &AppHandle) -> tauri::State<'_, Bar> {
    app.state::<Bar>()
}

fn webview(app: &AppHandle) -> Option<Webview> {
    app.get_webview(LABEL)
}

/// Adds the bar over everything in the main window; must run after setup.
pub fn create(app: &AppHandle) -> tauri::Result<()> {
    let window = overlay::main_window(app);
    let width = window
        .inner_size()?
        .to_logical::<f64>(window.scale_factor()?)
        .width;
    let builder = WebviewBuilder::new(LABEL, WebviewUrl::App("bar.html".into()))
        .additional_browser_args(service::BROWSER_ARGS)
        .transparent(true);
    window.add_child(
        builder,
        LogicalPosition::new(0.0, 0.0),
        LogicalSize::new(width, HEIGHT),
    )?;
    bar_state(app).visible.store(true, Ordering::SeqCst);
    remember_host(app)?;
    let handle = app.clone();
    let watcher = thread::spawn(move || watch_hover(&handle));
    let _ = bar_state(app).watcher.set(watcher.thread().clone());
    refresh(app);
    Ok(())
}

/// Keeps the bar a strip across the full width after the window changed size.
pub fn fit(app: &AppHandle) -> tauri::Result<()> {
    let Some(bar) = webview(app) else {
        return Ok(());
    };
    let window = overlay::main_window(app);
    let width = window
        .inner_size()?
        .to_logical::<f64>(window.scale_factor()?)
        .width;
    bar.set_size(LogicalSize::new(width, HEIGHT))
}

fn remember_host(app: &AppHandle) -> tauri::Result<()> {
    let Some(bar) = webview(app) else {
        return Ok(());
    };
    let handle = app.clone();
    bar.with_webview(move |platform| {
        let mut host = Default::default();
        // SAFETY: the controller is alive during this callback and only reports its window.
        if unsafe { platform.controller().ParentWindow(&mut host) }.is_ok() {
            bar_state(&handle)
                .host
                .store(host.0 as isize, Ordering::SeqCst);
        }
    })
}

fn host(app: &AppHandle) -> HWND {
    bar_state(app).host.load(Ordering::SeqCst) as HWND
}

/// Puts the bar back on top; a newly added service webview lands above it.
pub fn raise(app: &AppHandle) {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        SetWindowPos, HWND_TOP, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE,
    };
    let flags = SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE;
    // SAFETY: only reorders floawty's own bar window; a null handle makes the call fail harmlessly.
    unsafe { SetWindowPos(host(app), HWND_TOP, 0, 0, 0, 0, flags) };
}

/// Hover only decides while a service is visible and can be clicked.
fn hover_applies(state: &OverlayState) -> bool {
    state.service_id.is_some() && !state.settings_open && !state.click_through
}

/// The bar always shows the click-through dot, and stays on the tiles and in the settings.
fn wanted(state: &OverlayState, hovered: bool) -> bool {
    state.click_through || !hover_applies(state) || hovered
}

/// Shows or hides the bar after a state change and wakes the hover watcher.
pub fn refresh(app: &AppHandle) {
    let state = app.state::<Overlay>().state();
    let applies = hover_applies(&state);
    bar_state(app)
        .hover_applies
        .store(applies, Ordering::SeqCst);
    let hovered = applies && bar_state(app).hovered.load(Ordering::SeqCst);
    set_visible(app, wanted(&state, hovered));
    if let Some(watcher) = bar_state(app).watcher.get() {
        watcher.unpark();
    }
}

fn set_visible(app: &AppHandle, visible: bool) {
    if bar_state(app).visible.swap(visible, Ordering::SeqCst) == visible {
        return;
    }
    let Some(bar) = webview(app) else {
        return;
    };
    let _ = if visible { bar.show() } else { bar.hide() };
    // A hidden webview keeps its page "visible", so the page learns it from here to fade in.
    let _ = app.emit_to(EventTarget::webview(LABEL), "bar-visible", visible);
}

// Plain Win32 calls only: each Tauri window query would wait for the main thread ten times a second.
fn watch_hover(app: &AppHandle) {
    use windows_sys::Win32::UI::WindowsAndMessaging::IsWindowVisible;
    let Ok(main) = overlay::main_window(app).hwnd() else {
        return;
    };
    let main = main.0 as HWND;
    let started = Instant::now();
    let mut hover = Hover::default();
    loop {
        // SAFETY: a read-only query on floawty's own main window.
        let shown = unsafe { IsWindowVisible(main) } != 0;
        if !shown || !bar_state(app).hover_applies.load(Ordering::SeqCst) {
            hover = Hover::default();
            bar_state(app).hovered.store(false, Ordering::SeqCst);
            thread::park();
            continue;
        }
        let hovered = hover.visible(look(main, host(app), started));
        let was_hovered = bar_state(app).hovered.swap(hovered, Ordering::SeqCst);
        if hovered != was_hovered {
            set_visible(app, hovered);
        }
        if was_hovered && !hovered {
            hand_keys_to_service(app, main);
        }
        thread::sleep(LOOK_INTERVAL);
    }
}

fn look(main: HWND, bar: HWND, started: Instant) -> Sample {
    use windows_sys::Win32::Foundation::POINT;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetAncestor, GetCursorPos, IsChild, WindowFromPoint, GA_ROOT,
    };
    let mut cursor = POINT { x: 0, y: 0 };
    // SAFETY: plain Win32 queries with a valid out-pointer; no handle is kept.
    let (inside, over_bar) = unsafe {
        let found = GetCursorPos(&mut cursor) != 0;
        let under = WindowFromPoint(cursor);
        let inside = found && GetAncestor(under, GA_ROOT) == main;
        (inside, inside && (under == bar || IsChild(bar, under) != 0))
    };
    Sample {
        inside,
        over_bar,
        cursor: (cursor.x, cursor.y),
        now_ms: started.elapsed().as_millis() as u64,
    }
}

// A clicked bar keeps the keyboard; give it back to the video, but never take it from other apps.
fn hand_keys_to_service(app: &AppHandle, main: HWND) {
    use windows_sys::Win32::UI::WindowsAndMessaging::GetForegroundWindow;
    // SAFETY: only compares the foreground window handle with floawty's own.
    if unsafe { GetForegroundWindow() } == main {
        service::focus(app);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mode::Mode;
    use crate::settings::Settings;

    fn state(service: bool, settings_open: bool, click_through: bool) -> OverlayState {
        let settings = Settings::default();
        OverlayState {
            mode: Mode::Floaty,
            opacity: 1.0,
            click_through,
            service_id: service.then(|| "youtube".into()),
            settings_open,
            hotkeys: settings.hotkeys,
            language: settings.language,
            shorts: settings.shorts,
            update_check: settings.update_check,
        }
    }

    #[test]
    fn over_a_service_the_bar_follows_the_hover() {
        assert!(!wanted(&state(true, false, false), false));
        assert!(wanted(&state(true, false, false), true));
    }

    #[test]
    fn on_the_tiles_and_in_the_settings_the_bar_stays() {
        assert!(wanted(&state(false, false, false), false));
        assert!(wanted(&state(true, true, false), false));
    }

    #[test]
    fn click_through_always_shows_the_dot() {
        assert!(wanted(&state(true, false, true), false));
    }
}
