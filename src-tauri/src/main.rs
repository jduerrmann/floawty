//! floawty: streaming services in a small always-on-top overlay.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod geometry;
mod hotkeys;
mod logbook;
mod mode;
mod overlay;
mod persistence;
mod settings;

use tauri::{AppHandle, Manager, WindowEvent};

use overlay::{Overlay, OverlayState};

#[tauri::command]
fn webview_version() -> Option<String> {
    tauri::webview_version().ok()
}

#[tauri::command]
fn overlay_state(app: AppHandle) -> OverlayState {
    app.state::<Overlay>().state()
}

#[tauri::command]
fn toggle_mode(app: AppHandle) -> Result<(), String> {
    overlay::toggle_mode(&app).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_opacity(app: AppHandle, value: f64) -> Result<(), String> {
    overlay::set_opacity(&app, value).map_err(|e| e.to_string())
}

fn setup(app: &AppHandle) -> tauri::Result<()> {
    let version = app.package_info().version.to_string();
    let webview = tauri::webview_version().ok();
    logbook::write(app, &logbook::startup_message(&version, webview.as_deref()));

    let settings_path = app.path().data_dir()?.join("floawty").join("settings.json");
    app.manage(Overlay::load(settings_path));
    overlay::place_and_show(app)?;
    hotkeys::register(app, &app.state::<Overlay>().settings().hotkeys);

    let handle = app.clone();
    overlay::main_window(app).on_window_event(move |event| {
        if matches!(event, WindowEvent::Moved(_) | WindowEvent::Resized(_)) {
            overlay::settle_later(&handle);
        }
    });
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            webview_version,
            overlay_state,
            set_opacity,
            toggle_mode
        ])
        .setup(|app| Ok(setup(app.handle())?))
        .run(tauri::generate_context!())
        .expect("error while running floawty");
}
