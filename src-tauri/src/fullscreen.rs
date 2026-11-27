//! A page's fullscreen: floawty takes it over from Tauri, whose own handler always fills the screen.
use std::ops::Range;
use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{AppHandle, Manager, Webview};
use webview2_com::ContainsFullScreenElementChangedEventHandler;

use crate::logbook;
use crate::overlay::{self, Overlay};

/// Tauri registers its handler right after the webview is created; WebView2 counts tokens up.
const TOKENS_TO_CLEAR: i64 = 64;

/// Whether the service page shows an element in fullscreen.
#[derive(Default)]
pub struct PageFullscreen(AtomicBool);

/// Replaces Tauri's fullscreen handler on a new service webview with floawty's.
pub fn take_over(app: &AppHandle, service: &Webview) {
    let handle = app.clone();
    let asked = service.with_webview(move |platform| {
        // SAFETY: the controller is alive during this callback.
        let core = match unsafe { platform.controller().CoreWebView2() } {
            Ok(core) => core,
            Err(error) => return not_taken_over(&handle, &error.to_string()),
        };
        let on_change = handle.clone();
        let handler =
            ContainsFullScreenElementChangedEventHandler::create(Box::new(move |sender, _| {
                let Some(sender) = sender else {
                    return Ok(());
                };
                let mut contains = Default::default();
                // SAFETY: the sender is the live webview that raised the event.
                unsafe { sender.ContainsFullScreenElement(&mut contains) }?;
                set_page_fullscreen(&on_change, contains.as_bool());
                Ok(())
            }));
        let mut ours = 0;
        // SAFETY: registers on the live webview, which keeps the handler for its lifetime.
        let added = unsafe { core.add_ContainsFullScreenElementChanged(&handler, &mut ours) };
        if let Err(error) = added {
            return not_taken_over(&handle, &error.to_string());
        }
        // Tauri keeps its token to itself; a token this event never handed out is ignored.
        for token in earlier_tokens(ours) {
            // SAFETY: only removes handlers of this event on this webview.
            let _ = unsafe { core.remove_ContainsFullScreenElementChanged(token) };
        }
    });
    if let Err(error) = asked {
        not_taken_over(app, &error.to_string());
    }
}

// Tauri's handler then stays; `undo_unwanted` keeps the window size.
fn not_taken_over(app: &AppHandle, error: &str) {
    logbook::write(
        app,
        &format!("could not take over page fullscreen: {error}"),
    );
}

/// The service page went away (call after closing it): a page fullscreen ends with it.
pub fn page_closed(app: &AppHandle) {
    let handle = app.clone();
    // Queued behind the webview's close, so a last event of the old page cannot set it again.
    let _ = app.run_on_main_thread(move || set_page_fullscreen(&handle, false));
}

fn set_page_fullscreen(app: &AppHandle, on: bool) {
    app.state::<PageFullscreen>().0.store(on, Ordering::SeqCst);
    sync(app);
}

/// Puts the window in or out of fullscreen after the page or the switch changed.
pub fn sync(app: &AppHandle) {
    let app = app.clone();
    // Never inside WebView2's callback, where Tauri would resize at once; reading the wish
    // on the main thread keeps quick changes from landing out of order.
    std::thread::spawn(move || {
        let handle = app.clone();
        let _ = app.run_on_main_thread(move || {
            let _ = overlay::main_window(&handle).set_fullscreen(wanted(&handle));
        });
    });
}

/// The window went fullscreen although the switch keeps pages in it: floawty takes it back.
pub fn undo_unwanted(app: &AppHandle) -> bool {
    let window = overlay::main_window(app);
    if !window.is_fullscreen().unwrap_or(false) || wanted(app) {
        return false;
    }
    logbook::write(
        app,
        "window went fullscreen against the switch; floawty took it back",
    );
    let _ = window.set_fullscreen(false);
    true
}

fn wanted(app: &AppHandle) -> bool {
    let page = app.state::<PageFullscreen>().0.load(Ordering::SeqCst);
    window_fullscreen(page, app.state::<Overlay>().settings().fullscreen_in_window)
}

fn window_fullscreen(page_fullscreen: bool, fullscreen_in_window: bool) -> bool {
    page_fullscreen && !fullscreen_in_window
}

fn earlier_tokens(ours: i64) -> Range<i64> {
    (ours - TOKENS_TO_CLEAR).max(0)..ours
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_window_takes_the_screen_only_when_switched_off() {
        assert!(!window_fullscreen(true, true));
        assert!(window_fullscreen(true, false));
        assert!(!window_fullscreen(false, false));
        assert!(!window_fullscreen(false, true));
    }

    #[test]
    fn the_handlers_before_ours_are_removed_within_a_cap() {
        assert_eq!(earlier_tokens(23), 0..23);
        assert_eq!(earlier_tokens(1000), 936..1000);
        assert!(earlier_tokens(0).is_empty());
    }
}
