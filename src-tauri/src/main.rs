//! floawty: streaming services in a small always-on-top overlay.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod startup_log;

use std::fs::{self, OpenOptions};
use std::io::{self, Write};
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Manager};

#[tauri::command]
fn webview_version() -> Option<String> {
    tauri::webview_version().ok()
}

// Logs stay local (AGENTS.md rule 8): %APPDATA%\floawty\logs\floawty.log.
fn write_startup_line(app: &AppHandle) -> io::Result<()> {
    let data_dir = app
        .path()
        .data_dir()
        .map_err(|e| io::Error::other(e.to_string()))?;
    let log_dir = data_dir.join("floawty").join("logs");
    fs::create_dir_all(&log_dir)?;
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.as_secs());
    let version = app.package_info().version.to_string();
    let line = startup_log::startup_line(now, &version, tauri::webview_version().ok().as_deref());
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_dir.join("floawty.log"))?;
    writeln!(file, "{line}")
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![webview_version])
        .setup(|app| {
            // A missing log must never stop floawty from starting.
            if let Err(error) = write_startup_line(app.handle()) {
                eprintln!("floawty: could not write the startup log: {error}");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running floawty");
}
