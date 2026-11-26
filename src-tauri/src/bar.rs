//! The bar: floawty's controls in a transparent webview on top of the service.
//! Over a service in the floaty view it shows on hover, only as wide as its controls; on
//! the tiles, in the settings and in window mode it stays, in window mode above the page.
use std::sync::atomic::{AtomicBool, AtomicIsize, Ordering};
use std::sync::{Mutex, OnceLock};
use std::thread::{self, Thread};
use std::time::{Duration, Instant};

use tauri::{
    AppHandle, Emitter, EventTarget, LogicalPosition, LogicalSize, Manager, Webview,
    WebviewBuilder, WebviewUrl,
};
use windows_sys::Win32::Foundation::HWND;

use crate::hover::{Hover, Sample};
use crate::mode::Mode;
use crate::overlay::{self, Overlay, OverlayState};
use crate::page;
use crate::service;
use crate::theme;

const LABEL: &str = "bar";
pub const HEIGHT: f64 = 40.0;
// Room around the controls for their shadow.
const CONTROLS_MARGIN: f64 = 8.0;
// The service page is another process, so its mouse moves never reach floawty; a slow look at
// the cursor while a service is open is the only way to notice hovering.
const LOOK_INTERVAL: Duration = Duration::from_millis(100);

#[derive(Default)]
pub struct Bar {
    /// The cursor is watched while a service is visible and can be clicked.
    watching: AtomicBool,
    /// The bar follows the hover only in the floaty view.
    hover_applies: AtomicBool,
    hovered: AtomicBool,
    visible: AtomicBool,
    /// The bar's own window handle, to tell "over the bar" from "over the video".
    host: AtomicIsize,
    watcher: OnceLock<Thread>,
    /// Natural width of the controls, reported by the bar page.
    controls_width: Mutex<Option<f64>>,
}

/// Where the bar and the service sit in the window, in logical pixels.
#[derive(Debug, PartialEq)]
struct Layout {
    bar_x: f64,
    bar_width: f64,
    service_top: f64,
}

// The transparent rest of a full-width bar would swallow clicks on the page beneath.
fn layout(state: &OverlayState, width: f64, controls: Option<f64>) -> Layout {
    let full = Layout {
        bar_x: 0.0,
        bar_width: width,
        service_top: 0.0,
    };
    if state.mode == Mode::Window {
        return Layout {
            service_top: HEIGHT,
            ..full
        };
    }
    match controls {
        Some(controls) if hover_applies(state) => {
            let bar_width = (controls + CONTROLS_MARGIN).min(width);
            Layout {
                bar_x: ((width - bar_width) / 2.0).floor(),
                bar_width,
                service_top: 0.0,
            }
        }
        _ => full,
    }
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
    let chosen = app.state::<Overlay>().settings().theme;
    let builder = WebviewBuilder::new(LABEL, WebviewUrl::App("bar.html".into()))
        .additional_browser_args(&service::current_browser_args(app))
        .initialization_script(theme::startup_script(chosen))
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

/// Places the bar and the service after the window, the state or the controls changed.
pub fn fit(app: &AppHandle) -> tauri::Result<()> {
    let window = overlay::main_window(app);
    let size = window
        .inner_size()?
        .to_logical::<f64>(window.scale_factor()?);
    let state = app.state::<Overlay>().state();
    let controls = *bar_state(app).controls_width.lock().unwrap();
    let layout = layout(&state, size.width, controls);
    if let Some(bar) = webview(app) {
        bar.set_position(LogicalPosition::new(layout.bar_x, 0.0))?;
        bar.set_size(LogicalSize::new(layout.bar_width, HEIGHT))?;
    }
    service::fit(app, layout.service_top, size)
}

pub fn set_controls_width(app: &AppHandle, width: f64) -> tauri::Result<()> {
    *bar_state(app).controls_width.lock().unwrap() = Some(width);
    fit(app)
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

/// The page hears about the cursor (Shorts hold) while a service is visible and can be clicked.
fn watch_applies(state: &OverlayState) -> bool {
    let visible = state.service_id.is_some() && state.opening.is_none();
    visible && !state.settings_open && !state.click_through
}

/// The bar follows the hover over a service in the floaty view; in window mode it stays.
fn hover_applies(state: &OverlayState) -> bool {
    state.mode == Mode::Floaty && watch_applies(state)
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
    bar_state(app)
        .watching
        .store(watch_applies(&state), Ordering::SeqCst);
    let hovered = applies && bar_state(app).hovered.load(Ordering::SeqCst);
    set_visible(app, wanted(&state, hovered));
    let _ = fit(app);
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
        if !shown || !bar_state(app).watching.load(Ordering::SeqCst) {
            hover = Hover::default();
            bar_state(app).hovered.store(false, Ordering::SeqCst);
            page::set_hover(app, false);
            thread::park();
            continue;
        }
        let sample = look(main, host(app), started);
        // The page holds the Shorts automatic while the cursor is anywhere over floawty.
        page::set_hover(app, sample.inside);
        if !bar_state(app).hover_applies.load(Ordering::SeqCst) {
            hover = Hover::default();
            bar_state(app).hovered.store(false, Ordering::SeqCst);
            thread::sleep(LOOK_INTERVAL);
            continue;
        }
        let hovered = hover.visible(sample);
        let was_hovered = bar_state(app).hovered.swap(hovered, Ordering::SeqCst);
        // Asked before hiding: once the bar is hidden, Windows has moved the focus away.
        let keys_back = was_hovered && !hovered && bar_has_keys(main, host(app));
        if hovered != was_hovered {
            set_visible(app, hovered);
        }
        if keys_back {
            service::focus(app);
        }
        thread::sleep(LOOK_INTERVAL);
    }
}

fn look(main: HWND, bar: HWND, started: Instant) -> Sample {
    use windows_sys::Win32::Foundation::POINT;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetAncestor, GetCursorPos, IsChild, WindowFromPoint, GA_ROOT, GA_ROOTOWNER,
    };
    let mut cursor = POINT { x: 0, y: 0 };
    // SAFETY: plain Win32 queries with a valid out-pointer; no handle is kept.
    let (inside, over_bar) = unsafe {
        let found = GetCursorPos(&mut cursor) != 0;
        let under = WindowFromPoint(cursor);
        // A page's pop-up (a suggestion list) is owned by floawty's window and counts as inside.
        let inside = found
            && (GetAncestor(under, GA_ROOT) == main || GetAncestor(under, GA_ROOTOWNER) == main);
        (inside, inside && (under == bar || IsChild(bar, under) != 0))
    };
    Sample {
        inside,
        over_bar,
        cursor: (cursor.x, cursor.y),
        now_ms: started.elapsed().as_millis() as u64,
    }
}

// Only a bar that holds the keyboard gives it back: taking it from the page would close the
// page's own pop-ups, such as a sign-in suggestion list.
fn bar_has_keys(main: HWND, bar: HWND) -> bool {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetGUIThreadInfo, IsChild, GUITHREADINFO,
    };
    // SAFETY: read-only queries; the struct is zeroed and sized as GetGUIThreadInfo requires.
    unsafe {
        if GetForegroundWindow() != main {
            return false;
        }
        let mut info: GUITHREADINFO = std::mem::zeroed();
        info.cbSize = std::mem::size_of::<GUITHREADINFO>() as u32;
        GetGUIThreadInfo(0, &mut info) != 0
            && (info.hwndFocus == bar || IsChild(bar, info.hwndFocus) != 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
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
            theme: settings.theme,
            animations: settings.animations,
            shorts: settings.shorts,
            update_check: settings.update_check,
            graphics_acceleration: settings.graphics_acceleration,
            video_only: false,
            zoom: false,
            always_on_top: settings.always_on_top,
            fullscreen_in_window: settings.fullscreen_in_window,
            page_problems: Vec::new(),
            opening: None,
        }
    }

    #[test]
    fn over_a_service_the_bar_follows_the_hover() {
        assert!(!wanted(&state(true, false, false), false));
        assert!(wanted(&state(true, false, false), true));
    }

    #[test]
    fn while_a_service_opens_the_bar_stays_as_on_the_tiles() {
        let mut opening = state(true, false, false);
        opening.opening = Some("youtube".into());
        assert!(wanted(&opening, false));
    }

    #[test]
    fn on_the_tiles_and_in_the_settings_the_bar_stays() {
        assert!(wanted(&state(false, false, false), false));
        assert!(wanted(&state(true, true, false), false));
    }

    fn in_window_mode(mut state: OverlayState) -> OverlayState {
        state.mode = Mode::Window;
        state
    }

    #[test]
    fn over_a_service_in_the_floaty_view_the_bar_is_as_wide_as_its_controls() {
        let bar = layout(&state(true, false, false), 800.0, Some(300.0));
        assert_eq!(
            bar,
            Layout {
                bar_x: 246.0,
                bar_width: 308.0,
                service_top: 0.0
            }
        );
        let narrow = layout(&state(true, false, false), 250.0, Some(300.0));
        assert_eq!((narrow.bar_x, narrow.bar_width), (0.0, 250.0));
    }

    #[test]
    fn the_bar_spans_the_window_where_it_stays_or_shows_the_dot() {
        for state in [
            state(false, false, false),
            state(true, true, false),
            state(true, false, true),
        ] {
            let bar = layout(&state, 800.0, Some(300.0));
            assert_eq!(
                (bar.bar_x, bar.bar_width, bar.service_top),
                (0.0, 800.0, 0.0)
            );
        }
        let unknown = layout(&state(true, false, false), 800.0, None);
        assert_eq!(unknown.bar_width, 800.0);
    }

    #[test]
    fn in_window_mode_the_bar_stays_and_the_cursor_is_still_watched() {
        let service = in_window_mode(state(true, false, false));
        assert!(wanted(&service, false));
        assert!(!hover_applies(&service));
        assert!(watch_applies(&service));
        assert!(!watch_applies(&in_window_mode(state(true, true, false))));
    }

    #[test]
    fn in_window_mode_the_bar_stays_above_the_page() {
        let service = in_window_mode(state(true, false, false));
        let bar = layout(&service, 800.0, Some(300.0));
        assert_eq!(
            (bar.bar_x, bar.bar_width, bar.service_top),
            (0.0, 800.0, HEIGHT)
        );
    }

    #[test]
    fn click_through_always_shows_the_dot() {
        assert!(wanted(&state(true, false, true), false));
    }
}
