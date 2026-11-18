//! Global hotkeys from the settings; a hotkey another app holds is logged, never fatal.
use std::str::FromStr;

use serde::Deserialize;
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

use crate::logbook;
use crate::overlay::{self, Overlay};
use crate::service;
use crate::settings::Hotkeys;

/// What a hotkey does; the names are the keys of `hotkeys` in the settings file.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Action {
    ToggleVisible,
    ClickThrough,
    OpacityUp,
    OpacityDown,
    WindowMode,
    PlayPause,
    VideoOnly,
}

const ACTIONS: [Action; 7] = [
    Action::ToggleVisible,
    Action::ClickThrough,
    Action::OpacityUp,
    Action::OpacityDown,
    Action::WindowMode,
    Action::PlayPause,
    Action::VideoOnly,
];

/// Why a new hotkey was not taken; the UI shows a text for each.
#[derive(Debug, PartialEq, Eq)]
pub enum ChangeError {
    Invalid,
    Taken,
}

impl ChangeError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::Invalid => "hotkeyUnsupported",
            Self::Taken => "hotkeyTaken",
        }
    }
}

fn slot(hotkeys: &mut Hotkeys, action: Action) -> &mut String {
    match action {
        Action::ToggleVisible => &mut hotkeys.toggle_visible,
        Action::ClickThrough => &mut hotkeys.click_through,
        Action::OpacityUp => &mut hotkeys.opacity_up,
        Action::OpacityDown => &mut hotkeys.opacity_down,
        Action::WindowMode => &mut hotkeys.window_mode,
        Action::PlayPause => &mut hotkeys.play_pause,
        Action::VideoOnly => &mut hotkeys.video_only,
    }
}

fn run(app: &AppHandle, action: Action) -> tauri::Result<()> {
    match action {
        Action::ToggleVisible => overlay::toggle_visible(app),
        Action::ClickThrough => overlay::toggle_click_through(app),
        Action::OpacityUp => overlay::step_opacity(app, 1),
        Action::OpacityDown => overlay::step_opacity(app, -1),
        Action::WindowMode => overlay::toggle_mode(app),
        Action::PlayPause => service::play_pause(app),
        Action::VideoOnly => {
            overlay::toggle_video_only(app);
            Ok(())
        }
    }
}

fn bind(
    app: &AppHandle,
    action: Action,
    shortcut: Shortcut,
) -> Result<(), tauri_plugin_global_shortcut::Error> {
    app.global_shortcut()
        .on_shortcut(shortcut, move |app, _, event| {
            if event.state() == ShortcutState::Pressed {
                if let Err(error) = run(app, action) {
                    logbook::write(app, &format!("hotkey action failed: {error}"));
                }
            }
        })
}

pub fn register(app: &AppHandle, hotkeys: &Hotkeys) {
    let mut hotkeys = hotkeys.clone();
    for action in ACTIONS {
        let text = slot(&mut hotkeys, action).clone();
        let result = Shortcut::from_str(&text)
            .map_err(|error| format!("is not valid: {error}"))
            .and_then(|shortcut| {
                bind(app, action, shortcut)
                    .map_err(|error| format!("not registered (taken by another app?): {error}"))
            });
        if let Err(problem) = result {
            logbook::write(app, &format!("hotkey {text:?} {problem}"));
        }
    }
}

/// Takes all hotkeys away while the settings record a new one, so its keys reach the page.
pub fn set_paused(app: &AppHandle, paused: bool) {
    let _ = app.global_shortcut().unregister_all();
    if !paused {
        register(app, &app.state::<Overlay>().settings().hotkeys);
    }
}

/// Replaces one hotkey at once; the old one stays if the new one cannot be registered.
pub fn change(app: &AppHandle, action: Action, text: String) -> Result<(), ChangeError> {
    let new = Shortcut::from_str(&text).map_err(|_| ChangeError::Invalid)?;
    let mut hotkeys = app.state::<Overlay>().settings().hotkeys;
    let old = Shortcut::from_str(slot(&mut hotkeys, action)).ok();
    if let Some(old) = old {
        let _ = app.global_shortcut().unregister(old);
    }
    if bind(app, action, new).is_err() {
        if let Some(old) = old {
            let _ = bind(app, action, old);
        }
        return Err(ChangeError::Taken);
    }
    app.state::<Overlay>()
        .update(app, |s| *slot(&mut s.hotkeys, action) = text);
    overlay::emit_state(app);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_action_name_from_the_ui_finds_its_own_setting() {
        let names = [
            ("toggleVisible", "Ctrl+Alt+Shift+O"),
            ("clickThrough", "Ctrl+Alt+Shift+D"),
            ("opacityUp", "Ctrl+Alt+Shift+Up"),
            ("opacityDown", "Ctrl+Alt+Shift+Down"),
            ("windowMode", "Ctrl+Alt+Shift+F"),
            ("playPause", "Ctrl+Alt+Shift+Space"),
            ("videoOnly", "Ctrl+Alt+Shift+V"),
        ];
        let mut hotkeys = Hotkeys::default();
        for (name, default) in names {
            let action: Action = serde_json::from_str(&format!("\"{name}\"")).unwrap();
            assert_eq!(slot(&mut hotkeys, action), default, "{name}");
        }
    }

    #[test]
    fn the_default_hotkeys_are_valid_shortcuts() {
        let mut hotkeys = Hotkeys::default();
        for action in ACTIONS {
            assert!(
                Shortcut::from_str(slot(&mut hotkeys, action)).is_ok(),
                "{action:?}"
            );
        }
    }
}
