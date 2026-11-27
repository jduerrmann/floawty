//! Service webviews: one shown at a time, others awake if asked, in floawty's shared profile.
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, PoisonError};

use tauri::webview::{NewWindowResponse, PageLoadEvent};
use tauri::window::Color;
use tauri::{
    AppHandle, LogicalPosition, LogicalSize, Manager, Url, Webview, WebviewBuilder, WebviewUrl, Wry,
};

use crate::awake::{self, KeepAwake};
use crate::bar;
use crate::fullscreen;
use crate::logbook;
use crate::navigation::{self, Decision};
use crate::overlay::{self, Overlay};
use crate::page;
use crate::settings::OpenService;
use crate::sign_in_window;
use crate::theme;

mod keep;
pub use keep::Views;

// The shown or opening webview's number (0: none); callbacks of hidden webviews check it.
static SHOWN: AtomicU64 = AtomicU64::new(0);
static NEXT: AtomicU64 = AtomicU64::new(1);
// Only worker threads take it (add_child waits for the main thread), so a close never slips into an open.
static SWITCHING: Mutex<()> = Mutex::new(());
const BROWSER_ARGS: &str =
    "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --disable-background-networking";
const PAUSE: &str = "document.querySelectorAll('video, audio').forEach((m) => m.pause())";
// Its own file, so the adapter tests can run it on fixture pages.
const PLAY_PAUSE: &str = include_str!("play_pause.js");

/// WebView2's arguments; every webview of one run must get the same, they share one profile.
pub fn browser_args(graphics_acceleration: bool) -> String {
    if graphics_acceleration {
        BROWSER_ARGS.into()
    } else {
        format!("{BROWSER_ARGS} --disable-gpu")
    }
}

/// The arguments this run started with; the setting only changes right before a restart.
pub fn current_browser_args(app: &AppHandle) -> String {
    browser_args(app.state::<Overlay>().settings().graphics_acceleration)
}

fn label(number: u64) -> String {
    format!("service-{number}")
}

fn is_shown(number: u64) -> bool {
    SHOWN.load(Ordering::SeqCst) == number
}

/// The shown (or opening) service webview.
pub fn current(app: &AppHandle) -> Option<Webview> {
    match SHOWN.load(Ordering::SeqCst) {
        0 => None,
        number => app.get_webview(&label(number)),
    }
}

/// Opens a service over floawty's own page; an open service is closed first.
/// Its webview waits left of the window until its first document starts loading.
pub fn open(app: &AppHandle, service: OpenService) -> tauri::Result<()> {
    let _switching = SWITCHING.lock().unwrap_or_else(PoisonError::into_inner);
    // A tile clicked again while its page has not come yet starts nothing.
    if !app.state::<Overlay>().start_opening(service.clone()) {
        return Ok(());
    }
    overlay::emit_state(app);
    let added = close_webview(app).and_then(|()| {
        if keep::wake(app, &service) {
            return Ok(());
        }
        add_webview(app, &service)
    });
    if added.is_err() {
        app.state::<Overlay>().end_opening();
        keep::shown_closed(app);
        overlay::emit_state(app);
    }
    added
}

fn add_webview(app: &AppHandle, service: &OpenService) -> tauri::Result<()> {
    let url: Url = service
        .url
        .parse()
        .map_err(|_| tauri::Error::InvalidWebviewUrl("service url"))?;
    let number = NEXT.fetch_add(1, Ordering::SeqCst);
    let sign_in = sign_in_window::handler(app.clone(), service);
    let mut builder = WebviewBuilder::new(label(number), WebviewUrl::External(url))
        .additional_browser_args(&current_browser_args(app))
        .background_color(theme::ground(app))
        .on_navigation(navigation_guard(
            app.clone(),
            service.allowed_domains.clone(),
            number,
        ))
        .on_new_window(move |url, features| {
            if is_shown(number) {
                sign_in(url, features)
            } else {
                NewWindowResponse::Deny
            }
        });
    let script = page::script(app, &service.id);
    let scripted = script.is_some();
    page::reset(app, scripted);
    keep::shown_new(app, service, number, scripted);
    if let Some(script) = script {
        builder = with_page_script(app, builder, script, number);
    }
    if let Some(zoom) = page::zoom_script(app) {
        builder = builder.initialization_script(zoom);
    }
    builder = with_load_hook(app, builder, scripted, number);
    let window = overlay::main_window(app);
    let size = window
        .inner_size()?
        .to_logical::<f64>(window.scale_factor()?);
    let (position, size) = place(0.0, size, true);
    let webview = window.add_child(builder, position, size)?;
    fullscreen::take_over(app, &webview);
    bar::raise(app);
    Ok(())
}

/// The page took over: the service fills its place and becomes the last service.
fn reveal(app: &AppHandle) {
    let Some(service) = app.state::<Overlay>().end_opening() else {
        return;
    };
    app.state::<Overlay>()
        .update(app, |s| s.last_service = Some(service));
    overlay::emit_state(app);
}

/// Puts the service below `top` (the bar in window mode) and fills the rest of the window.
pub fn fit(app: &AppHandle, top: f64, window: LogicalSize<f64>) -> tauri::Result<()> {
    let Some(service) = current(app) else {
        return Ok(());
    };
    let opening = app.state::<Overlay>().opening().is_some();
    let (position, size) = place(top, window, opening);
    service.set_position(position)?;
    service.set_size(size)
}

// An opening service waits at full size left of the window; made at size 0 it never shows popups.
fn place(
    top: f64,
    window: LogicalSize<f64>,
    opening: bool,
) -> (LogicalPosition<f64>, LogicalSize<f64>) {
    let left = if opening { -window.width } else { 0.0 };
    let size = LogicalSize::new(window.width, (window.height - top).max(0.0));
    (LogicalPosition::new(left, top), size)
}

// The title is only a wake-up call and is never read: it names what the user watches.
fn with_page_script(
    app: &AppHandle,
    builder: WebviewBuilder<Wry>,
    script: String,
    number: u64,
) -> WebviewBuilder<Wry> {
    let on_title = app.clone();
    builder
        .initialization_script(script)
        .on_document_title_changed(move |_, _| {
            if is_shown(number) {
                page::wake(&on_title);
            }
        })
}

/// The first document to start or end shows the service; every loaded page learns the zoom.
fn with_load_hook(
    app: &AppHandle,
    builder: WebviewBuilder<Wry>,
    scripted: bool,
    number: u64,
) -> WebviewBuilder<Wry> {
    let on_load = app.clone();
    builder.on_page_load(move |webview, payload| {
        let finished = payload.event() == PageLoadEvent::Finished;
        if finished {
            // The ground only bridges the wait: a page without a background of its own gets white.
            let _ = webview.set_background_color(Some(Color(0xff, 0xff, 0xff, 0xff)));
        }
        if !is_shown(number) {
            if finished {
                keep::quiet(&webview);
            }
            return;
        }
        reveal(&on_load);
        if finished {
            if scripted {
                page::wake(&on_load);
            }
            page::push_zoom(&on_load);
        }
    })
}

/// Back to the tiles, the service kept awake if the user wants it; the next start opens the tiles.
pub fn close(app: &AppHandle) -> tauri::Result<()> {
    let _switching = SWITCHING.lock().unwrap_or_else(PoisonError::into_inner);
    // A service closed while it opens is never kept: its page has not even started.
    let opening = app.state::<Overlay>().end_opening().is_some();
    let slept = match current(app) {
        Some(webview) if !opening => keep::put_to_sleep(app, &webview)?,
        _ => false,
    };
    if !slept {
        close_webview(app)?;
    }
    page::reset(app, false);
    app.state::<Overlay>()
        .update(app, |s| s.last_service = None);
    overlay::emit_state(app);
    Ok(())
}

fn close_webview(app: &AppHandle) -> tauri::Result<()> {
    sign_in_window::wait_for_build();
    sign_in_window::close(app);
    let closed = match current(app) {
        Some(webview) => webview.close(),
        None => Ok(()),
    };
    keep::shown_closed(app);
    fullscreen::page_closed(app);
    closed
}

fn navigation_guard(
    app: AppHandle,
    allowed: Vec<String>,
    number: u64,
) -> impl Fn(&Url) -> bool + Send {
    move |url| match navigation::decide(url, &allowed) {
        Decision::Stay => true,
        Decision::OpenInBrowser => {
            // Only the host is logged: watched URLs never go into the log.
            let host = url.host_str().unwrap_or(url.scheme());
            if !is_shown(number) {
                logbook::write(&app, &format!("kept a hidden service from leaving: {host}"));
                return false;
            }
            logbook::write(&app, &format!("opened outside floawty: {host}"));
            open_in_browser(url);
            false
        }
    }
}

pub fn open_in_browser(url: &Url) {
    use windows_sys::Win32::UI::Shell::ShellExecuteW;
    use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;
    if !matches!(url.scheme(), "http" | "https" | "mailto") {
        return;
    }
    let wide = |text: &str| text.encode_utf16().chain(Some(0)).collect::<Vec<u16>>();
    let (verb, target) = (wide("open"), wide(url.as_str()));
    // SAFETY: both strings are NUL-terminated and live until the call returns.
    unsafe {
        ShellExecuteW(
            std::ptr::null_mut(),
            verb.as_ptr(),
            target.as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            SW_SHOWNORMAL,
        );
    }
}

pub fn pause(app: &AppHandle) {
    if let Some(webview) = current(app) {
        let _ = webview.eval(PAUSE);
    }
}

pub fn play_pause(app: &AppHandle) -> tauri::Result<()> {
    match current(app) {
        Some(webview) => webview.eval(PLAY_PAUSE),
        None => Ok(()),
    }
}

/// The settings cover the service: its video pauses and its webview is hidden meanwhile.
pub fn cover(app: &AppHandle, covered: bool) -> tauri::Result<()> {
    let Some(webview) = current(app) else {
        return Ok(());
    };
    if covered {
        webview.eval(PAUSE)?;
        webview.hide()
    } else {
        webview.show()
    }
}

/// The setting changed: what it has no more room for closes at once.
pub fn set_keep_awake(app: &AppHandle, keep: KeepAwake) {
    let _switching = SWITCHING.lock().unwrap_or_else(PoisonError::into_inner);
    app.state::<Overlay>().update(app, |s| s.keep_awake = keep);
    keep::trim(app, keep::showing(app));
    overlay::emit_state(app);
}

/// Own tiles were removed: their awake webviews close.
pub fn forget_tiles(app: &AppHandle, before: &[String], after: &[String]) {
    let _switching = SWITCHING.lock().unwrap_or_else(PoisonError::into_inner);
    keep::forget(app, &awake::removed(before, after));
}

pub fn focus(app: &AppHandle) {
    if let Some(webview) = current(app) {
        let _ = webview.set_focus();
    }
}

#[cfg(test)]
mod tests {
    use super::{browser_args, place};
    use tauri::{LogicalPosition, LogicalSize};

    #[test]
    fn an_opening_service_waits_left_of_the_window_so_the_tiles_stay_in_sight() {
        let window = LogicalSize::new(480.0, 270.0);
        assert_eq!(
            place(0.0, window, true),
            (LogicalPosition::new(-480.0, 0.0), window)
        );
    }

    #[test]
    fn an_open_service_fills_the_window_below_the_bar() {
        let window = LogicalSize::new(480.0, 270.0);
        assert_eq!(
            place(32.0, window, false),
            (
                LogicalPosition::new(0.0, 32.0),
                LogicalSize::new(480.0, 238.0)
            )
        );
    }

    #[test]
    fn with_graphics_acceleration_webview2_keeps_its_gpu() {
        assert_eq!(
            browser_args(true),
            "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --disable-background-networking"
        );
    }

    #[test]
    fn without_graphics_acceleration_webview2_starts_without_its_gpu() {
        assert_eq!(
            browser_args(false),
            format!("{} --disable-gpu", browser_args(true))
        );
    }
}
