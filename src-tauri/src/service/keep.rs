//! Service webviews kept loaded out of sight ([[services-stay-awake-on-request]]).
use std::sync::atomic::Ordering;
use std::sync::{Mutex, PoisonError};

use tauri::{AppHandle, Manager, Webview};
use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2_8;
use windows_core::Interface;

use super::{label, reveal, PAUSE, SHOWN};
use crate::awake::{self, Awake, KeepAwake};
use crate::bar;
use crate::fullscreen;
use crate::logbook;
use crate::overlay::Overlay;
use crate::page;
use crate::settings::OpenService;
use crate::sign_in_window;

// While resting, whatever starts playing later (autoplay, a reload) is paused again at once.
const REST: &str = "(() => { window.__floawtyResting = true; \
     if (!window.__floawtyQuiet) { window.__floawtyQuiet = true; \
     document.addEventListener('play', (e) => { if (window.__floawtyResting) e.target.pause(); }, true); } \
     if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); })()";
const WAKE: &str = "window.__floawtyResting = false";

/// The shown service and the awake ones, least recently used first.
#[derive(Default)]
pub struct Views {
    shown: Option<Awake>,
    awake: Vec<Awake>,
}

fn views(app: &AppHandle) -> std::sync::MutexGuard<'_, Views> {
    app.state::<Mutex<Views>>()
        .inner()
        .lock()
        .unwrap_or_else(PoisonError::into_inner)
}

/// A new webview `number` shows `service`.
pub fn shown_new(app: &AppHandle, service: &OpenService, number: u64, scripted: bool) {
    views(app).shown = Some(Awake {
        service: service.clone(),
        number,
        scripted,
    });
    SHOWN.store(number, Ordering::SeqCst);
}

/// The shown webview went away.
pub fn shown_closed(app: &AppHandle) {
    views(app).shown = None;
    SHOWN.store(0, Ordering::SeqCst);
}

/// Shows an awake webview of `service` if there is one; closes what the setting has no room for.
pub fn wake(app: &AppHandle, service: &OpenService) -> bool {
    let keep = app.state::<Overlay>().settings().keep_awake;
    let (entry, close) = {
        let mut views = views(app);
        let opening = awake::on_open(keep, &views.awake, service);
        let entry = take(&mut views.awake, opening.show);
        views
            .awake
            .retain(|other| !opening.close.contains(&other.number));
        (entry, opening.close)
    };
    close
        .into_iter()
        .for_each(|number| close_number(app, number));
    let Some(entry) = entry else {
        return false;
    };
    let Some(webview) = app.get_webview(&label(entry.number)) else {
        return false;
    };
    if show(app, &webview, entry).is_ok() {
        return true;
    }
    // A webview that cannot be shown again is closed and loaded anew.
    let _ = webview.close();
    shown_closed(app);
    false
}

fn take(awake: &mut Vec<Awake>, number: Option<u64>) -> Option<Awake> {
    let index = awake
        .iter()
        .position(|entry| Some(entry.number) == number)?;
    Some(awake.remove(index))
}

fn show(app: &AppHandle, webview: &Webview, entry: Awake) -> tauri::Result<()> {
    let scripted = entry.scripted;
    let number = entry.number;
    views(app).shown = Some(entry);
    SHOWN.store(number, Ordering::SeqCst);
    page::reset(app, scripted);
    // Fitted to its place first, so it never paints a frame at old bounds.
    reveal(app);
    set_resting(webview, false);
    let _ = webview.eval(WAKE);
    webview.show()?;
    bar::raise(app);
    page::wake(app);
    page::push_zoom(app);
    Ok(())
}

/// Hides the shown service instead of closing it; false when there is none to keep.
pub fn put_to_sleep(app: &AppHandle, webview: &Webview) -> tauri::Result<bool> {
    let keep = app.state::<Overlay>().settings().keep_awake;
    let Some(entry) = views(app).shown.take() else {
        return Ok(false);
    };
    if keep == KeepAwake::Off {
        views(app).shown = Some(entry);
        return Ok(false);
    }
    SHOWN.store(0, Ordering::SeqCst);
    sign_in_window::wait_for_build();
    sign_in_window::close(app);
    page::rest(app, webview);
    quiet(webview);
    set_resting(webview, true);
    if webview.hide().is_err() {
        let _ = webview.close();
        fullscreen::page_closed(app);
        return Ok(true);
    }
    fullscreen::page_closed(app);
    views(app).awake.push(entry);
    trim(app, false);
    Ok(true)
}

/// Pauses the page and keeps it paused; also after a load of a page out of sight.
pub fn quiet(webview: &Webview) {
    let _ = webview.eval(PAUSE);
    let _ = webview.eval(REST);
}

/// Closes the awake webviews the setting has no more room for.
pub fn trim(app: &AppHandle, showing: bool) {
    let keep = app.state::<Overlay>().settings().keep_awake;
    let close = {
        let mut views = views(app);
        let close = awake::beyond_room(keep, &views.awake, showing);
        views.awake.retain(|entry| !close.contains(&entry.number));
        close
    };
    close
        .into_iter()
        .for_each(|number| close_number(app, number));
}

/// Whether a service is shown or opening, for a trim after the setting changed.
pub fn showing(app: &AppHandle) -> bool {
    views(app).shown.is_some()
}

/// Closes the awake webviews of own tiles that no longer exist.
pub fn forget(app: &AppHandle, ids: &[String]) {
    let close: Vec<u64> = {
        let mut views = views(app);
        let (gone, stay) = std::mem::take(&mut views.awake)
            .into_iter()
            .partition(|entry| ids.contains(&entry.service.id));
        views.awake = stay;
        gone.into_iter().map(|entry: Awake| entry.number).collect()
    };
    close
        .into_iter()
        .for_each(|number| close_number(app, number));
}

fn close_number(app: &AppHandle, number: u64) {
    if let Some(webview) = app.get_webview(&label(number)) {
        let _ = webview.close();
    }
}

// Hiding the window alone leaves the page "visible" and loud; WebView2 itself throttles and mutes it.
fn set_resting(webview: &Webview, resting: bool) {
    let app = webview.app_handle().clone();
    let _ = webview.with_webview(move |platform| {
        let controller = platform.controller();
        // SAFETY: the controller and its webview are alive during this callback.
        unsafe {
            let _ = controller.SetIsVisible(!resting);
            let Ok(core) = controller.CoreWebView2() else {
                return;
            };
            match core.cast::<ICoreWebView2_8>() {
                Ok(core) => {
                    let _ = core.SetIsMuted(resting);
                }
                // An old WebView2 without muting: pausing alone keeps the page quiet.
                Err(_) => logbook::write(&app, "could not mute a service out of sight"),
            }
        }
    });
}
