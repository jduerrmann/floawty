//! Global hotkeys from the settings; a hotkey another app holds is logged, never fatal.
use std::str::FromStr;

use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

use crate::logbook;
use crate::overlay;
use crate::settings::Hotkeys;

#[derive(Clone, Copy)]
enum Action {
    ToggleVisible,
    ClickThrough,
    OpacityUp,
    OpacityDown,
}

fn bindings(hotkeys: &Hotkeys) -> [(Action, &str); 4] {
    [
        (Action::ToggleVisible, &hotkeys.toggle_visible),
        (Action::ClickThrough, &hotkeys.click_through),
        (Action::OpacityUp, &hotkeys.opacity_up),
        (Action::OpacityDown, &hotkeys.opacity_down),
    ]
}

fn run(app: &AppHandle, action: Action) -> tauri::Result<()> {
    match action {
        Action::ToggleVisible => overlay::toggle_visible(app),
        Action::ClickThrough => overlay::toggle_click_through(app),
        Action::OpacityUp => overlay::step_opacity(app, 1),
        Action::OpacityDown => overlay::step_opacity(app, -1),
    }
}

pub fn register(app: &AppHandle, hotkeys: &Hotkeys) {
    for (action, text) in bindings(hotkeys) {
        let shortcut = match Shortcut::from_str(text) {
            Ok(shortcut) => shortcut,
            Err(error) => {
                logbook::write(app, &format!("hotkey {text:?} is not valid: {error}"));
                continue;
            }
        };
        let result = app
            .global_shortcut()
            .on_shortcut(shortcut, move |app, _, event| {
                if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    if let Err(error) = run(app, action) {
                        logbook::write(app, &format!("hotkey action failed: {error}"));
                    }
                }
            });
        if let Err(error) = result {
            logbook::write(
                app,
                &format!("hotkey {text:?} not registered (taken by another app?): {error}"),
            );
        }
    }
}
