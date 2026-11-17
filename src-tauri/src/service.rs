//! The service webview: one at a time, in floawty's shared WebView2 profile, on its domains.
use tauri::{AppHandle, LogicalPosition, Manager, Url, Webview, WebviewBuilder, WebviewUrl};

use crate::bar;
use crate::logbook;
use crate::navigation::{self, Decision};
use crate::overlay::{self, Overlay};
use crate::settings::OpenService;

const LABEL: &str = "service";
// Must equal the main window's arguments in tauri.conf.json: one profile, one set of options.
pub const BROWSER_ARGS: &str =
    "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --disable-background-networking";
const PAUSE: &str = "document.querySelectorAll('video').forEach((v) => v.pause())";
const PLAY_PAUSE: &str =
    "(() => { const v = document.querySelector('video'); if (v) v.paused ? v.play() : v.pause(); })()";

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
    let builder = WebviewBuilder::new(LABEL, WebviewUrl::External(url))
        .additional_browser_args(BROWSER_ARGS)
        .auto_resize()
        .on_navigation(navigation_guard(
            app.clone(),
            service.allowed_domains.clone(),
        ));
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

/// Back to the tiles; the next start opens the tiles too.
pub fn close(app: &AppHandle) -> tauri::Result<()> {
    close_webview(app)?;
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
