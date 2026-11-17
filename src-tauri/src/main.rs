//! floawty: streaming services in a small always-on-top overlay.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod geometry;
mod hotkeys;
mod logbook;
mod mode;
mod navigation;
mod overlay;
mod paths;
mod persistence;
mod service;
mod settings;

use tauri::{AppHandle, Manager, WindowEvent};

use overlay::Overlay;

fn setup(app: &AppHandle) -> tauri::Result<()> {
    let version = app.package_info().version.to_string();
    let webview = tauri::webview_version().ok();
    logbook::write(app, &logbook::startup_message(&version, webview.as_deref()));

    app.manage(Overlay::load(
        paths::floawty_dir(app)?.join("settings.json"),
    ));
    overlay::place_and_show(app)?;
    let settings = app.state::<Overlay>().settings();
    hotkeys::register(app, &settings.hotkeys);
    if let Some(last) = settings.last_service {
        // Adding the service webview during setup crashes WebView2; afterwards it works.
        let handle = app.clone();
        tauri::async_runtime::spawn(async move {
            if let Err(error) = service::open(&handle, last) {
                logbook::write(
                    &handle,
                    &format!("could not reopen the last service: {error}"),
                );
            }
        });
    }

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
            commands::webview_version,
            commands::overlay_state,
            commands::set_opacity,
            commands::toggle_mode,
            commands::tiles_state,
            commands::accept_notice,
            commands::set_custom_tiles,
            commands::open_service,
            commands::close_service
        ])
        .setup(|app| Ok(setup(app.handle())?))
        .run(tauri::generate_context!())
        .expect("error while running floawty");
}
