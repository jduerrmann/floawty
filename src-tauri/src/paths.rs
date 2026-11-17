//! Where floawty keeps its files: `%APPDATA%\floawty`, or `FLOAWTY_DATA_DIR` for tests.
use std::io;
use std::path::PathBuf;

use tauri::{AppHandle, Manager};

pub fn floawty_dir(app: &AppHandle) -> io::Result<PathBuf> {
    if let Some(dir) = std::env::var_os("FLOAWTY_DATA_DIR") {
        return Ok(PathBuf::from(dir));
    }
    let data_dir = app
        .path()
        .data_dir()
        .map_err(|e| io::Error::other(e.to_string()))?;
    Ok(data_dir.join("floawty"))
}
