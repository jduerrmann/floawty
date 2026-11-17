//! The settings file: human-readable JSON, versioned, never fatal when broken.
use serde::{Deserialize, Serialize};

use crate::geometry::Rect;

pub const CURRENT_VERSION: u32 = 1;
const MIN_OPACITY: f64 = 0.1;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Hotkeys {
    pub toggle_visible: String,
    pub click_through: String,
    pub opacity_up: String,
    pub opacity_down: String,
}

impl Default for Hotkeys {
    fn default() -> Self {
        Self {
            toggle_visible: "Ctrl+Alt+Shift+O".into(),
            click_through: "Ctrl+Alt+Shift+D".into(),
            opacity_up: "Ctrl+Alt+Shift+Up".into(),
            opacity_down: "Ctrl+Alt+Shift+Down".into(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Settings {
    pub version: u32,
    pub opacity: f64,
    pub floaty: Option<Rect>,
    pub hotkeys: Hotkeys,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            version: CURRENT_VERSION,
            opacity: 1.0,
            floaty: None,
            hotkeys: Hotkeys::default(),
        }
    }
}

/// Reads settings text; anything unreadable falls back to defaults.
pub fn parse(text: &str) -> Settings {
    let mut settings: Settings = serde_json::from_str(text).unwrap_or_default();
    // Version 1 is the first format; files without a version are read as version 1.
    settings.version = CURRENT_VERSION;
    settings.opacity = clamp_opacity(settings.opacity);
    settings
}

pub fn to_json(settings: &Settings) -> String {
    serde_json::to_string_pretty(settings).expect("settings always serialize")
}

pub fn clamp_opacity(value: f64) -> f64 {
    if value.is_nan() {
        return 1.0;
    }
    value.clamp(MIN_OPACITY, 1.0)
}

/// Moves opacity by whole 10 % steps and keeps it on the step grid.
pub fn step_opacity(current: f64, steps: i32) -> f64 {
    let tenths = (current * 10.0).round() as i32 + steps;
    clamp_opacity(f64::from(tenths) / 10.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn broken_text_gives_defaults() {
        assert_eq!(parse("{ not json"), Settings::default());
    }

    #[test]
    fn missing_fields_are_filled_with_defaults() {
        let settings = parse(r#"{ "version": 1, "opacity": 0.6 }"#);
        assert_eq!(settings.opacity, 0.6);
        assert_eq!(settings.hotkeys, Hotkeys::default());
        assert_eq!(settings.floaty, None);
    }

    #[test]
    fn a_file_without_version_is_migrated_to_the_current_version() {
        let settings = parse(r#"{ "opacity": 0.5 }"#);
        assert_eq!(settings.version, CURRENT_VERSION);
        assert_eq!(settings.opacity, 0.5);
    }

    #[test]
    fn out_of_range_opacity_is_clamped_on_load() {
        assert_eq!(parse(r#"{ "opacity": 0.01 }"#).opacity, MIN_OPACITY);
        assert_eq!(parse(r#"{ "opacity": 7 }"#).opacity, 1.0);
    }

    #[test]
    fn written_settings_read_back_the_same() {
        let settings = Settings {
            opacity: 0.7,
            floaty: Some(Rect {
                x: -900,
                y: 300,
                width: 480,
                height: 270,
            }),
            ..Settings::default()
        };
        let text = to_json(&settings);
        assert!(text.contains("\"version\": 1"), "{text}");
        assert_eq!(parse(&text), settings);
    }

    #[test]
    fn opacity_never_leaves_10_to_100_percent() {
        assert_eq!(clamp_opacity(0.05), MIN_OPACITY);
        assert_eq!(clamp_opacity(1.2), 1.0);
        assert_eq!(clamp_opacity(0.55), 0.55);
    }

    #[test]
    fn opacity_steps_stay_on_the_10_percent_grid() {
        assert_eq!(step_opacity(0.55, 1), 0.7);
        assert_eq!(step_opacity(1.0, 1), 1.0);
        assert_eq!(step_opacity(0.2, -1), 0.1);
        assert_eq!(step_opacity(0.1, -1), 0.1);
    }
}
