//! The sign-in window: a service's sign-in pop-up in a small window floawty owns (decision sign-in-window-for-popups).
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc;
use std::time::{Duration, Instant};

use tauri::webview::{NewWindowFeatures, NewWindowResponse};
use tauri::{
    AppHandle, Manager, PhysicalPosition, PhysicalSize, Url, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder, Wry,
};

use crate::geometry::Rect;
use crate::logbook;
use crate::overlay;
use crate::settings::OpenService;
use crate::sign_in::{self, Request};

const LABEL: &str = "sign-in";
/// Start size in logical pixels; the window can be enlarged.
const SIZE: (f64, f64) = (480.0, 640.0);
const WATCH_EVERY: Duration = Duration::from_millis(300);
const BUILD_WAIT: Duration = Duration::from_secs(2);

// Building pumps messages, so a second request, a hide or a close can arrive before the label exists.
static BUILDING: AtomicBool = AtomicBool::new(false);

/// The service webview's pop-up handler; every pop-up that is not a sign-in stays denied.
pub fn handler(
    app: AppHandle,
    service: &OpenService,
) -> impl Fn(Url, NewWindowFeatures) -> NewWindowResponse<Wry> + Send {
    let sign_in_hosts = service.sign_in_hosts.clone();
    let allowed_domains = service.allowed_domains.clone();
    move |url, features| {
        let request = Request {
            url: &url,
            sign_in_hosts: &sign_in_hosts,
            busy: BUILDING.load(Ordering::SeqCst) || app.get_webview_window(LABEL).is_some(),
            foreground: overlay::in_front(&app),
        };
        if !sign_in::may_open(&request) {
            return NewWindowResponse::Deny;
        }
        BUILDING.store(true, Ordering::SeqCst);
        let built = build(&app, &url, &features, &sign_in_hosts, &allowed_domains);
        BUILDING.store(false, Ordering::SeqCst);
        match built {
            Ok(Some(window)) => NewWindowResponse::Create { window },
            Ok(None) => NewWindowResponse::Deny,
            Err(error) => {
                logbook::write(&app, &format!("sign-in window failed: {error}"));
                NewWindowResponse::Deny
            }
        }
    }
}

/// Closes the sign-in window, if one is open: with its service and when floawty hides.
pub fn close(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(LABEL) {
        let _ = window.destroy();
    }
}

/// Lets a window being built finish first: closing the service meanwhile would deadlock WebView2's setup.
/// Only for worker threads; the main thread is the one building.
pub fn wait_for_build() {
    let started = Instant::now();
    while BUILDING.load(Ordering::SeqCst) && started.elapsed() < BUILD_WAIT {
        std::thread::sleep(Duration::from_millis(20));
    }
}

fn build(
    app: &AppHandle,
    url: &Url,
    features: &NewWindowFeatures,
    sign_in_hosts: &[String],
    allowed_domains: &[String],
) -> tauri::Result<Option<WebviewWindow>> {
    let main = overlay::main_window(app);
    let guard = (
        app.clone(),
        sign_in_hosts.to_vec(),
        allowed_domains.to_vec(),
    );
    // The window starts on about:blank; WebView2 then loads the pop-up's page into it.
    // The opener's environment brings the shared profile and its browser arguments.
    let window = WebviewWindowBuilder::new(
        app,
        LABEL,
        WebviewUrl::External("about:blank".parse().expect("a valid url")),
    )
    .with_environment(features.opener().environment.clone())
    .title(sign_in::title(url))
    .inner_size(SIZE.0, SIZE.1)
    .visible(false)
    .owner_raw(main.hwnd()?)
    .on_navigation(move |url| navigation(&guard, url))
    // The page may move on to the service's own domains; the title always names the host shown.
    .on_page_load(|window, payload| {
        let _ = window.set_title(&sign_in::title(payload.url()));
    })
    .build()?;
    // floawty may have been hidden while the window was built.
    if !overlay::in_front(app) {
        let _ = window.destroy();
        return Ok(None);
    }
    if let Err(error) = place(&main, &window).and_then(|()| window.show()) {
        let _ = window.destroy();
        return Err(error);
    }
    watch_container(window.clone());
    Ok(Some(window))
}

fn navigation(guard: &(AppHandle, Vec<String>, Vec<String>), url: &Url) -> bool {
    let (app, sign_in_hosts, allowed_domains) = guard;
    let stays = sign_in::stays(url, sign_in_hosts, allowed_domains);
    if !stays {
        // Only the host is logged; an OAuth redirect must never open in the browser either.
        let host = url.host_str().unwrap_or(url.scheme());
        logbook::write(app, &format!("sign-in window stayed off: {host}"));
    }
    stays
}

fn place(main: &tauri::Window, window: &WebviewWindow) -> tauri::Result<()> {
    let scale = main.scale_factor()?;
    let size = (
        (SIZE.0 * scale).round() as u32,
        (SIZE.1 * scale).round() as u32,
    );
    let (position, inner) = (main.inner_position()?, main.inner_size()?);
    let owner = Rect {
        x: position.x,
        y: position.y,
        width: inner.width,
        height: inner.height,
    };
    let Some(monitor) = main.current_monitor()? else {
        return Ok(());
    };
    let area = monitor.work_area();
    let area = Rect {
        x: area.position.x,
        y: area.position.y,
        width: area.size.width,
        height: area.size.height,
    };
    let rect = sign_in::placement(owner, area, size);
    // Moving onto a monitor with another scale makes Windows rescale the window, so the size comes last.
    window.set_position(PhysicalPosition::new(rect.x, rect.y))?;
    window.set_size(PhysicalSize::new(rect.width, rect.height))
}

// When the page calls window.close(), wry destroys only the webview's container; the window itself is closed here.
fn watch_container(window: WebviewWindow) {
    let (sender, receiver) = mpsc::channel();
    let asked = window.with_webview(move |platform| {
        let mut container = Default::default();
        // SAFETY: the controller is alive during this callback and only reports its window.
        if unsafe { platform.controller().ParentWindow(&mut container) }.is_ok() {
            let _ = sender.send(container.0 as isize);
        }
    });
    if asked.is_err() {
        return;
    }
    std::thread::spawn(move || {
        let Ok(container) = receiver.recv_timeout(Duration::from_secs(5)) else {
            return;
        };
        while container_alive(container) {
            std::thread::sleep(WATCH_EVERY);
        }
        // A window the user already closed is gone; destroying it again does nothing.
        let _ = window.destroy();
    });
}

fn container_alive(container: isize) -> bool {
    use windows_sys::Win32::UI::WindowsAndMessaging::IsWindow;
    // SAFETY: IsWindow only asks whether the handle still names a window.
    unsafe { IsWindow(container as windows_sys::Win32::Foundation::HWND) != 0 }
}
