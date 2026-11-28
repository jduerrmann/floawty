//! Commands for floawty's own UI; service pages have no IPC access at all.
use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::awake::KeepAwake;
use crate::bar;
use crate::fullscreen;
use crate::hotkeys::{self, Action};
use crate::logbook;
use crate::overlay::{self, Overlay, OverlayState};
use crate::page;
use crate::paths;
use crate::reset;
use crate::service;
use crate::settings::{self, CustomTile, OpenService, Preferences};
use crate::single_instance;
use crate::theme;
use crate::{auto_update, updates};

type CommandResult = Result<(), String>;

fn report(result: tauri::Result<()>) -> CommandResult {
    result.map_err(|e| e.to_string())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TilesState {
    notice_accepted: bool,
    custom_tiles: Vec<CustomTile>,
}

#[tauri::command]
pub fn webview_version() -> Option<String> {
    tauri::webview_version().ok()
}

#[tauri::command]
pub fn overlay_state(app: AppHandle) -> OverlayState {
    app.state::<Overlay>().state()
}

#[tauri::command]
pub fn toggle_mode(app: AppHandle) -> CommandResult {
    report(overlay::toggle_mode(&app))
}

#[tauri::command]
pub fn set_bar_width(app: AppHandle, width: f64) -> CommandResult {
    report(bar::set_controls_width(&app, width))
}

#[tauri::command]
pub fn toggle_video_only(app: AppHandle) {
    overlay::toggle_video_only(&app);
}

#[tauri::command]
pub fn toggle_zoom(app: AppHandle) {
    overlay::toggle_zoom(&app);
}

#[tauri::command]
pub fn toggle_always_on_top(app: AppHandle) -> CommandResult {
    report(overlay::toggle_always_on_top(&app))
}

#[tauri::command]
pub fn set_opacity(app: AppHandle, value: f64) -> CommandResult {
    report(overlay::set_opacity(&app, value))
}

#[tauri::command]
pub fn tiles_state(app: AppHandle) -> TilesState {
    let settings = app.state::<Overlay>().settings();
    TilesState {
        notice_accepted: settings.notice_accepted,
        custom_tiles: settings.custom_tiles,
    }
}

#[tauri::command]
pub fn accept_notice(app: AppHandle) {
    app.state::<Overlay>()
        .update(&app, |s| s.notice_accepted = true);
}

#[tauri::command]
pub fn set_custom_tiles(app: AppHandle, tiles: Vec<CustomTile>) {
    let ids = |tiles: &[CustomTile]| tiles.iter().map(|tile| tile.id.clone()).collect::<Vec<_>>();
    let before = ids(&app.state::<Overlay>().settings().custom_tiles);
    let after = ids(&tiles);
    app.state::<Overlay>()
        .update(&app, |s| s.custom_tiles = tiles);
    // Closing webviews waits for open and close, which only worker threads may do.
    tauri::async_runtime::spawn(async move { service::forget_tiles(&app, &before, &after) });
}

/// Async: closing awake webviews waits for an open, which needs the main thread.
#[tauri::command]
pub async fn set_keep_awake(app: AppHandle, keep: KeepAwake) {
    service::set_keep_awake(&app, keep);
}

// Async: creating a WebView2 inside a sync (main-thread) command deadlocks.
#[tauri::command]
pub async fn open_service(app: AppHandle, service: OpenService) -> CommandResult {
    report(service::open(&app, service))
}

#[tauri::command]
pub async fn close_service(app: AppHandle) -> CommandResult {
    report(service::close(&app))
}

#[tauri::command]
pub fn toggle_click_through(app: AppHandle) -> CommandResult {
    report(overlay::toggle_click_through(&app))
}

/// The settings lie over the service, which pauses and hides meanwhile.
#[tauri::command]
pub fn set_settings_open(app: AppHandle, open: bool) -> CommandResult {
    app.state::<Overlay>().set_settings_open(open);
    let result = service::cover(&app, open);
    overlay::emit_state(&app);
    page::sync(&app);
    report(result.and_then(|()| focus(&app, false)))
}

#[tauri::command]
pub fn set_preferences(app: AppHandle, preferences: Preferences) {
    let before = app.state::<Overlay>().settings();
    let (chosen_theme, in_window, automatic) = (
        preferences.theme,
        preferences.fullscreen_in_window,
        preferences.update_check,
    );
    app.state::<Overlay>()
        .update(&app, |s| settings::apply_preferences(s, preferences));
    if chosen_theme != before.theme {
        theme::apply(&app, chosen_theme);
    }
    if in_window != before.fullscreen_in_window {
        fullscreen::sync(&app);
    }
    if automatic != before.update_check {
        auto_update::set_switch(&app, automatic);
    }
    overlay::emit_state(&app);
    page::sync(&app);
}

/// WebView2 takes its arguments only at start, so the choice is saved and floawty restarts.
#[tauri::command]
pub fn set_graphics_acceleration(app: AppHandle, enabled: bool) {
    app.state::<Overlay>()
        .update(&app, |s| s.graphics_acceleration = enabled);
    logbook::write(
        &app,
        &format!(
            "graphics acceleration turned {}, restarting",
            if enabled { "on" } else { "off" }
        ),
    );
    restart(&app)
}

/// The next floawty must be the first one again, and it never installs an update on the way.
fn restart(app: &AppHandle) -> ! {
    single_instance::release(app);
    app.restart()
}

#[tauri::command]
pub fn set_hotkey(app: AppHandle, action: Action, hotkey: String) -> CommandResult {
    hotkeys::change(&app, action, hotkey).map_err(|error| error.code().to_string())
}

#[tauri::command]
pub fn set_hotkeys_paused(app: AppHandle, paused: bool) {
    hotkeys::set_paused(&app, paused);
}

/// Keyboard users reach the bar with F6; F6 there goes back to the page below.
#[tauri::command]
pub fn move_focus(app: AppHandle, to_bar: bool) -> CommandResult {
    report(focus(&app, to_bar))
}

fn focus(app: &AppHandle, to_bar: bool) -> tauri::Result<()> {
    let state = app.state::<Overlay>().state();
    let label = match (to_bar, state.service_id.is_some() && !state.settings_open) {
        (true, _) => "bar",
        (false, true) => {
            return service::current(app).map_or(Ok(()), |webview| webview.set_focus())
        }
        (false, false) => "main",
    };
    match app.get_webview(label) {
        Some(webview) => webview.set_focus(),
        None => Ok(()),
    }
}

/// Deletes settings and the profile at the restart; the profile is in use until then.
#[tauri::command]
pub fn reset_all_data(app: AppHandle) -> CommandResult {
    let dir = paths::floawty_dir(&app).map_err(|e| e.to_string())?;
    reset::request(&dir).map_err(|e| e.to_string())?;
    logbook::write(&app, "reset of all data requested, restarting");
    restart(&app)
}

#[tauri::command]
pub fn quit(app: AppHandle) {
    updates::quit(&app);
}
