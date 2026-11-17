//! Commands for floawty's own UI; service pages have no IPC access at all.
use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::overlay::{self, Overlay, OverlayState};
use crate::service;
use crate::settings::{CustomTile, OpenService};

type CommandResult = Result<(), String>;

fn report(result: tauri::Result<()>) -> CommandResult {
    result.map_err(|e| e.to_string())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TilesState {
    notice_accepted: bool,
    custom_tiles: Vec<CustomTile>,
    open_service_id: Option<String>,
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
pub fn set_opacity(app: AppHandle, value: f64) -> CommandResult {
    report(overlay::set_opacity(&app, value))
}

#[tauri::command]
pub fn tiles_state(app: AppHandle) -> TilesState {
    let settings = app.state::<Overlay>().settings();
    TilesState {
        notice_accepted: settings.notice_accepted,
        custom_tiles: settings.custom_tiles,
        open_service_id: settings.last_service.map(|s| s.id),
    }
}

#[tauri::command]
pub fn accept_notice(app: AppHandle) {
    app.state::<Overlay>()
        .update(&app, |s| s.notice_accepted = true);
}

#[tauri::command]
pub fn set_custom_tiles(app: AppHandle, tiles: Vec<CustomTile>) {
    app.state::<Overlay>()
        .update(&app, |s| s.custom_tiles = tiles);
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
