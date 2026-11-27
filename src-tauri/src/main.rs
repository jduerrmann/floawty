//! floawty: streaming services in a small always-on-top overlay.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod bar;
mod commands;
mod distribution;
mod fullscreen;
mod geometry;
mod hotkeys;
mod hover;
mod logbook;
mod mode;
mod navigation;
mod opacity;
mod overlay;
mod page;
mod paths;
mod persistence;
mod reset;
mod service;
mod settings;
mod sign_in;
mod sign_in_window;
mod theme;

use tauri::{AppHandle, Manager, WebviewWindowBuilder, WindowEvent};

use bar::Bar;
use fullscreen::PageFullscreen;
use overlay::Overlay;
use page::Page;

/// A requested reset runs before any webview opens the profile.
fn reset_if_requested(app: &AppHandle) -> std::io::Result<()> {
    let (data, profile) = (paths::floawty_dir(app)?, paths::profile_dir(app)?);
    if reset::apply_if_requested(&data, &profile)? {
        logbook::write(app, "all data was reset at the user's request");
    }
    Ok(())
}

fn create_main_window(app: &AppHandle, browser_args: &str) -> tauri::Result<()> {
    let config = app
        .config()
        .app
        .windows
        .iter()
        .find(|w| w.label == "main")
        .expect("the main window is defined in tauri.conf.json");
    let theme = app.state::<Overlay>().settings().theme;
    WebviewWindowBuilder::from_config(app, config)?
        .additional_browser_args(browser_args)
        .initialization_script(theme::startup_script(theme))
        .build()?;
    Ok(())
}

// Adding webviews during setup crashes WebView2; afterwards it works.
fn add_bar_and_last_service(app: &AppHandle, last: Option<settings::OpenService>) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(error) = bar::create(&app) {
            logbook::write(&app, &format!("could not add the bar: {error}"));
        }
        if let Some(last) = last {
            if let Err(error) = service::open(&app, last) {
                logbook::write(&app, &format!("could not reopen the last service: {error}"));
            }
        }
    });
}

fn setup(app: &AppHandle, webview: &str) -> tauri::Result<()> {
    if let Err(error) = reset_if_requested(app) {
        logbook::write(
            app,
            &format!("could not reset all data, trying again next start: {error}"),
        );
    }
    app.manage(Overlay::load(
        paths::floawty_dir(app)?.join("settings.json"),
    ));
    if let Err(error) = create_main_window(app, &service::current_browser_args(app)) {
        // E.g. another floawty on the same profile still runs with other WebView2 arguments.
        logbook::write(app, &format!("could not create the main window: {error}"));
        return Err(error);
    }
    let version = app.package_info().version.to_string();
    let build = distribution::Build::current().name();
    logbook::write(app, &logbook::startup_message(&version, build, webview));
    if !app.state::<Overlay>().settings().graphics_acceleration {
        logbook::write(app, "graphics acceleration is off");
    }
    app.manage(Bar::default());
    app.manage(Page::default());
    app.manage(PageFullscreen::default());
    theme::apply(app, app.state::<Overlay>().settings().theme);
    overlay::place_and_show(app)?;
    let settings = app.state::<Overlay>().settings();
    hotkeys::register(app, &settings.hotkeys);
    add_bar_and_last_service(app, settings.last_service);

    let handle = app.clone();
    overlay::main_window(app).on_window_event(move |event| {
        if matches!(event, WindowEvent::Resized(_)) && fullscreen::undo_unwanted(&handle) {
            return;
        }
        if matches!(event, WindowEvent::Moved(_) | WindowEvent::Resized(_)) {
            overlay::settle_later(&handle);
        }
        if matches!(event, WindowEvent::Resized(_)) {
            let _ = bar::fit(&handle);
        }
    });
    Ok(())
}

fn main() {
    let Some(webview) = distribution::installed_webview(tauri::webview_version().ok()) else {
        distribution::explain_missing_webview();
        return;
    };
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::webview_version,
            commands::overlay_state,
            commands::set_opacity,
            commands::toggle_mode,
            commands::toggle_video_only,
            commands::toggle_zoom,
            commands::toggle_always_on_top,
            commands::set_bar_width,
            commands::tiles_state,
            commands::accept_notice,
            commands::set_custom_tiles,
            commands::open_service,
            commands::close_service,
            commands::toggle_click_through,
            commands::set_settings_open,
            commands::set_preferences,
            commands::set_graphics_acceleration,
            commands::set_hotkey,
            commands::set_hotkeys_paused,
            commands::move_focus,
            commands::reset_all_data,
            commands::quit
        ])
        .setup(move |app| Ok(setup(app.handle(), &webview)?))
        .run(tauri::generate_context!())
        .expect("error while running floawty");
}
