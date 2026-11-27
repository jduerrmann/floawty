//! The commands that export and import the settings file and apply an import live.
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::export_format::{check_import, copy_allowed, export_text, ImportError};
use crate::file_dialog;
use crate::fullscreen;
use crate::hotkeys;
use crate::logbook;
use crate::mode::Mode;
use crate::overlay::{self, Overlay};
use crate::page;
use crate::service;
use crate::settings::{CustomTile, Settings};
use crate::theme;

const FILE_NAME: &str = "floawty-settings.json";

/// A checked file waiting for the user's yes.
#[derive(Default)]
pub struct PendingImport(Mutex<Option<Settings>>);

impl PendingImport {
    fn set(&self, checked: Option<Settings>) {
        *self.0.lock().unwrap() = checked;
    }

    fn take(&self) -> Option<Settings> {
        self.0.lock().unwrap().take()
    }

    fn peek(&self) -> Option<Settings> {
        self.0.lock().unwrap().clone()
    }
}

/// What the settings page learns from a checked file, against the settings at check time.
#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportPreview {
    restart_needed: bool,
    /// The file's choice, for the restart question.
    graphics_acceleration: bool,
}

fn preview(checked: &Settings, current: &Settings) -> ImportPreview {
    ImportPreview {
        restart_needed: checked.graphics_acceleration != current.graphics_acceleration,
        graphics_acceleration: checked.graphics_acceleration,
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportApplied {
    /// The file's choice, for the restart question.
    graphics_acceleration: bool,
    restart_needed: bool,
}

fn stage(app: &AppHandle, text: &str) -> Result<ImportPreview, String> {
    let pending = app.state::<PendingImport>();
    pending.set(None);
    let current = app.state::<Overlay>().settings();
    let checked = check_import(text, &current).map_err(|error| error.code().to_string())?;
    let preview = preview(&checked, &current);
    pending.set(Some(checked));
    Ok(preview)
}

fn owner(app: &AppHandle) -> Result<isize, String> {
    let hwnd = overlay::main_window(app)
        .hwnd()
        .map_err(|error| error.to_string())?;
    Ok(hwnd.0 as isize)
}

fn dialog_failed(app: &AppHandle, code: u32) -> String {
    logbook::write(app, &format!("the file dialog failed: error {code}"));
    "file".into()
}

fn file_failed(app: &AppHandle, error: &std::io::Error) -> String {
    logbook::write(app, &format!("a settings file failed: {}", error.kind()));
    "file".into()
}

/// The file dialogs are modal and wait for the user, so they run on a thread made for blocking.
async fn pick(app: &AppHandle, saving: bool) -> Result<Option<PathBuf>, String> {
    let owner = owner(app)?;
    let picked = tauri::async_runtime::spawn_blocking(move || {
        if saving {
            file_dialog::save(owner, FILE_NAME)
        } else {
            file_dialog::open(owner)
        }
    })
    .await
    .map_err(|error| error.to_string())?;
    picked.map_err(|code| dialog_failed(app, code))
}

/// `false` when the user cancels the dialog.
#[tauri::command]
pub async fn export_settings_file(app: AppHandle) -> Result<bool, String> {
    let Some(path) = pick(&app, true).await? else {
        return Ok(false);
    };
    let text = export_text(&app.state::<Overlay>().settings());
    fs::write(path, text).map_err(|error| file_failed(&app, &error))?;
    Ok(true)
}

/// `None` when the user cancels; a good file waits as the pending import for `apply_import`.
#[tauri::command]
pub async fn import_settings_file(app: AppHandle) -> Result<Option<ImportPreview>, String> {
    app.state::<PendingImport>().set(None);
    let Some(path) = pick(&app, false).await? else {
        return Ok(None);
    };
    let bytes = fs::read(path).map_err(|error| file_failed(&app, &error))?;
    let text = String::from_utf8(bytes).map_err(|_| ImportError::Broken.code().to_string())?;
    stage(&app, &text).map(Some)
}

/// The user said no: the checked file is not applied later.
#[tauri::command]
pub fn discard_import(app: AppHandle) {
    app.state::<PendingImport>().set(None);
}

/// What the waiting import would change; the page notes it before `apply_import` reloads it.
#[tauri::command]
pub fn pending_import(app: AppHandle) -> Result<ImportPreview, String> {
    let checked = app.state::<PendingImport>().peek().ok_or("nothing")?;
    Ok(preview(&checked, &app.state::<Overlay>().settings()))
}

/// The export without a dialog, for the app tests.
#[tauri::command]
pub fn settings_export_text(app: AppHandle) -> String {
    export_text(&app.state::<Overlay>().settings())
}

/// The import check without a dialog, for the app tests; a good text waits as pending import.
#[tauri::command]
pub fn check_import_text(app: AppHandle, text: String) -> Result<ImportPreview, String> {
    stage(&app, &text)
}

/// Saves the pending import (graphics acceleration stays, it needs a restart) and applies it live.
#[tauri::command]
pub fn apply_import(app: AppHandle) -> Result<ImportApplied, String> {
    let Some(mut incoming) = app.state::<PendingImport>().take() else {
        return Err("nothing".into());
    };
    let before = app.state::<Overlay>().settings();
    let applied = ImportApplied {
        graphics_acceleration: incoming.graphics_acceleration,
        restart_needed: incoming.graphics_acceleration != before.graphics_acceleration,
    };
    incoming.graphics_acceleration = before.graphics_acceleration;
    go_live(&app, &before, &incoming);
    logbook::write(&app, "settings imported from a file");
    Ok(applied)
}

/// Does what the single settings commands do, for what the import changed.
fn go_live(app: &AppHandle, before: &Settings, incoming: &Settings) {
    let note = |result: tauri::Result<()>| {
        if let Err(error) = result {
            logbook::write(app, &format!("an imported setting did not apply: {error}"));
        }
    };
    note(overlay::set_opacity(app, incoming.opacity));
    // Window mode has no always-on-top switch; it takes the value for the floaty view later.
    if before.mode == Mode::Floaty && incoming.always_on_top != before.always_on_top {
        note(overlay::toggle_always_on_top(app));
    }
    app.state::<Overlay>()
        .update(app, |s| copy_allowed(s, incoming));
    if incoming.hotkeys != before.hotkeys {
        // Registers the saved hotkeys anew.
        hotkeys::set_paused(app, false);
    }
    if incoming.theme != before.theme {
        theme::apply(app, incoming.theme);
    }
    if incoming.fullscreen_in_window != before.fullscreen_in_window {
        fullscreen::sync(app);
    }
    forget_removed_tiles(app, &before.custom_tiles, &incoming.custom_tiles);
    if incoming.keep_awake != before.keep_awake {
        let (app, keep) = (app.clone(), incoming.keep_awake);
        // Closing awake webviews waits for the main thread, so a worker does it.
        tauri::async_runtime::spawn(async move { service::set_keep_awake(&app, keep) });
    }
    overlay::emit_state(app);
    page::sync(app);
    if incoming.zoom != before.zoom {
        page::push_zoom(app);
    }
}

fn forget_removed_tiles(app: &AppHandle, before: &[CustomTile], after: &[CustomTile]) {
    let ids = |tiles: &[CustomTile]| tiles.iter().map(|tile| tile.id.clone()).collect::<Vec<_>>();
    let (before, after) = (ids(before), ids(after));
    if before == after {
        return;
    }
    let app = app.clone();
    tauri::async_runtime::spawn(async move { service::forget_tiles(&app, &before, &after) });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_a_different_graphics_acceleration_needs_a_restart() {
        let with = |on: bool| Settings {
            graphics_acceleration: on,
            ..Settings::default()
        };
        let preview_of = |file: bool, current: bool| preview(&with(file), &with(current));
        let expected = |restart_needed, graphics_acceleration| ImportPreview {
            restart_needed,
            graphics_acceleration,
        };
        assert_eq!(preview_of(false, true), expected(true, false));
        assert_eq!(preview_of(true, false), expected(true, true));
        assert_eq!(preview_of(true, true), expected(false, true));
    }
}
