//! The service webview: one at a time, in floawty's shared WebView2 profile, on its domains.
use tauri::webview::PageLoadEvent;
use tauri::{
    AppHandle, LogicalPosition, LogicalSize, Manager, Url, Webview, WebviewBuilder, WebviewUrl, Wry,
};

use crate::bar;
use crate::logbook;
use crate::navigation::{self, Decision};
use crate::overlay::{self, Overlay};
use crate::page;
use crate::settings::OpenService;

pub const LABEL: &str = "service";
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

fn current(app: &AppHandle) -> Option<Webview> {
    app.get_webview(LABEL)
}

/// Opens a service over floawty's own page; an open service is closed first.
pub fn open(app: &AppHandle, service: OpenService) -> tauri::Result<()> {
    close_webview(app)?;
    let url: Url = service
        .url
        .parse()
        .map_err(|_| tauri::Error::InvalidWebviewUrl("service url"))?;
    let mut builder = WebviewBuilder::new(LABEL, WebviewUrl::External(url))
        .additional_browser_args(&current_browser_args(app))
        .on_navigation(navigation_guard(
            app.clone(),
            service.allowed_domains.clone(),
        ));
    let script = page::script(app, &service.id);
    let scripted = script.is_some();
    page::reset(app, scripted);
    if let Some(script) = script {
        builder = with_page_script(app, builder, script);
    }
    if let Some(zoom) = page::zoom_script(app) {
        builder = builder.initialization_script(zoom);
    }
    builder = with_load_hook(app, builder, scripted);
    let window = overlay::main_window(app);
    let size = window
        .inner_size()?
        .to_logical::<f64>(window.scale_factor()?);
    window.add_child(builder, LogicalPosition::new(0.0, 0.0), size)?;
    bar::raise(app);
    app.state::<Overlay>()
        .update(app, |s| s.last_service = Some(service));
    overlay::emit_state(app);
    Ok(())
}

/// Puts the service below `top` (the bar in window mode) and fills the rest of the window.
pub fn fit(app: &AppHandle, top: f64, window: LogicalSize<f64>) -> tauri::Result<()> {
    let Some(service) = current(app) else {
        return Ok(());
    };
    service.set_position(LogicalPosition::new(0.0, top))?;
    service.set_size(LogicalSize::new(
        window.width,
        (window.height - top).max(0.0),
    ))
}

// The title is only a wake-up call and is never read: it names what the user watches.
fn with_page_script(
    app: &AppHandle,
    builder: WebviewBuilder<Wry>,
    script: String,
) -> WebviewBuilder<Wry> {
    let on_title = app.clone();
    builder
        .initialization_script(script)
        .on_document_title_changed(move |_, _| page::wake(&on_title))
}

/// Every loaded page learns the zoom; a scripted one is also asked for its status.
fn with_load_hook(
    app: &AppHandle,
    builder: WebviewBuilder<Wry>,
    scripted: bool,
) -> WebviewBuilder<Wry> {
    let on_load = app.clone();
    builder.on_page_load(move |_, payload| {
        if payload.event() == PageLoadEvent::Finished {
            if scripted {
                page::wake(&on_load);
            }
            page::push_zoom(&on_load);
        }
    })
}

/// Back to the tiles; the next start opens the tiles too.
pub fn close(app: &AppHandle) -> tauri::Result<()> {
    close_webview(app)?;
    page::reset(app, false);
    app.state::<Overlay>()
        .update(app, |s| s.last_service = None);
    overlay::emit_state(app);
    Ok(())
}

fn close_webview(app: &AppHandle) -> tauri::Result<()> {
    match current(app) {
        Some(webview) => webview.close(),
        None => Ok(()),
    }
}

fn navigation_guard(app: AppHandle, allowed: Vec<String>) -> impl Fn(&Url) -> bool + Send {
    move |url| match navigation::decide(url, &allowed) {
        Decision::Stay => true,
        Decision::OpenInBrowser => {
            // Only the host is logged: watched URLs never go into the log.
            let host = url.host_str().unwrap_or(url.scheme());
            logbook::write(&app, &format!("opened outside floawty: {host}"));
            open_in_browser(url);
            false
        }
    }
}

fn open_in_browser(url: &Url) {
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

pub fn focus(app: &AppHandle) {
    if let Some(webview) = current(app) {
        let _ = webview.set_focus();
    }
}

#[cfg(test)]
mod tests {
    use super::browser_args;

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
