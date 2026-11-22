//! The settings file: human-readable JSON, versioned, never fatal when broken.
use serde::{Deserialize, Serialize};

use crate::geometry::Rect;
use crate::mode::Mode;
use crate::opacity;

pub const CURRENT_VERSION: u32 = 1;
const DEFAULT_SHORTS_PAUSE: f64 = 1.0;
const MAX_SHORTS_PAUSE: f64 = 10.0;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Hotkeys {
    pub toggle_visible: String,
    pub click_through: String,
    pub opacity_up: String,
    pub opacity_down: String,
    pub window_mode: String,
    pub play_pause: String,
    pub video_only: String,
    pub zoom: String,
    pub always_on_top: String,
}

impl Default for Hotkeys {
    fn default() -> Self {
        Self {
            toggle_visible: "Ctrl+Alt+Shift+O".into(),
            click_through: "Ctrl+Alt+Shift+D".into(),
            opacity_up: "Ctrl+Alt+Shift+Up".into(),
            opacity_down: "Ctrl+Alt+Shift+Down".into(),
            window_mode: "Ctrl+Alt+Shift+F".into(),
            play_pause: "Ctrl+Alt+Shift+Space".into(),
            video_only: "Ctrl+Alt+Shift+V".into(),
            zoom: "Ctrl+Alt+Shift+Z".into(),
            always_on_top: "Ctrl+Alt+Shift+T".into(),
        }
    }
}

/// A tile the user added for any web page.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomTile {
    pub id: String,
    pub name: String,
    pub url: String,
}

/// The service open at closing time, reopened on the next start.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenService {
    pub id: String,
    pub url: String,
    pub allowed_domains: Vec<String>,
    /// Hosts whose sign-in pop-up opens in floawty's sign-in window; older files have none.
    #[serde(default)]
    pub sign_in_hosts: Vec<String>,
}

/// The language of floawty's own UI; `System` follows Windows.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Language {
    En,
    De,
    #[default]
    #[serde(other)]
    System,
}

/// Light or dark for floawty's own pages and title bar; `System` follows Windows.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Light,
    Dark,
    #[default]
    #[serde(other)]
    System,
}

/// How the floaty view finds its size while a Short plays.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PortraitSize {
    /// Each aspect keeps its own saved size.
    Separate,
    /// One size, turned: the sides swap.
    #[default]
    #[serde(other)]
    Rotated,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Shorts {
    pub auto: bool,
    pub pause_seconds: f64,
    pub hold_on_hover: bool,
    pub portrait_size: PortraitSize,
}

impl Default for Shorts {
    fn default() -> Self {
        Self {
            auto: false,
            pause_seconds: DEFAULT_SHORTS_PAUSE,
            hold_on_hover: true,
            portrait_size: PortraitSize::Rotated,
        }
    }
}

/// What the settings panel changes besides the hotkeys.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Preferences {
    pub language: Language,
    pub theme: Theme,
    pub shorts: Shorts,
    pub update_check: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Settings {
    pub version: u32,
    pub opacity: f64,
    pub mode: Mode,
    pub floaty: Option<Rect>,
    pub floaty_portrait: Option<Rect>,
    pub window: Option<Rect>,
    pub hotkeys: Hotkeys,
    pub notice_accepted: bool,
    pub custom_tiles: Vec<CustomTile>,
    pub last_service: Option<OpenService>,
    pub language: Language,
    pub theme: Theme,
    pub shorts: Shorts,
    /// Off by default; floawty only talks to GitHub once the user turns it on.
    pub update_check: bool,
    /// One switch for all services; it only takes effect in the floaty view.
    pub video_only: bool,
    /// One switch for all services; it only takes effect in the floaty view.
    pub zoom: bool,
    /// Off starts WebView2 without its GPU; it takes effect at the next start.
    pub graphics_acceleration: bool,
    /// Off lets other windows cover the floaty view; click-through keeps it on top anyway.
    pub always_on_top: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            version: CURRENT_VERSION,
            opacity: 1.0,
            mode: Mode::Floaty,
            floaty: None,
            floaty_portrait: None,
            window: None,
            hotkeys: Hotkeys::default(),
            notice_accepted: false,
            custom_tiles: Vec::new(),
            last_service: None,
            language: Language::System,
            theme: Theme::System,
            shorts: Shorts::default(),
            update_check: false,
            video_only: false,
            zoom: false,
            graphics_acceleration: true,
            always_on_top: true,
        }
    }
}

/// Reads settings text; anything unreadable falls back to defaults.
pub fn parse(text: &str) -> Settings {
    let mut settings: Settings = serde_json::from_str(text).unwrap_or_default();
    // Version 1 is the first format; files without a version are read as version 1.
    settings.version = CURRENT_VERSION;
    settings.opacity = opacity::clamp(settings.opacity);
    settings.shorts.pause_seconds = clamp_shorts_pause(settings.shorts.pause_seconds);
    settings
}

/// Takes the panel's choices, kept within their ranges.
pub fn apply_preferences(settings: &mut Settings, preferences: Preferences) {
    settings.language = preferences.language;
    settings.theme = preferences.theme;
    settings.shorts = Shorts {
        pause_seconds: clamp_shorts_pause(preferences.shorts.pause_seconds),
        ..preferences.shorts
    };
    settings.update_check = preferences.update_check;
}

pub fn to_json(settings: &Settings) -> String {
    serde_json::to_string_pretty(settings).expect("settings always serialize")
}

fn clamp_shorts_pause(seconds: f64) -> f64 {
    if seconds.is_nan() {
        return DEFAULT_SHORTS_PAUSE;
    }
    seconds.clamp(0.0, MAX_SHORTS_PAUSE)
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
    fn a_file_from_before_window_mode_starts_floaty() {
        let settings = parse(
            r#"{ "version": 1, "floaty": { "x": 16, "y": 16, "width": 480, "height": 270 } }"#,
        );
        assert_eq!(settings.mode, Mode::Floaty);
        assert_eq!(settings.window, None);
        assert_eq!(settings.hotkeys.window_mode, "Ctrl+Alt+Shift+F");
    }

    #[test]
    fn custom_tiles_and_the_last_service_survive_a_round_trip() {
        let settings = Settings {
            notice_accepted: true,
            custom_tiles: vec![CustomTile {
                id: "custom-1".into(),
                name: "My stream".into(),
                url: "https://example.com/live".into(),
            }],
            last_service: Some(OpenService {
                id: "netflix".into(),
                url: "https://www.netflix.com/browse".into(),
                allowed_domains: vec!["netflix.com".into()],
                sign_in_hosts: vec!["accounts.google.com".into()],
            }),
            ..Settings::default()
        };
        assert_eq!(parse(&to_json(&settings)), settings);
    }

    #[test]
    fn an_open_service_from_before_sign_in_windows_keeps_everything_else() {
        let settings = parse(
            r#"{ "version": 1, "opacity": 0.5, "lastService": { "id": "tiktok",
            "url": "https://www.tiktok.com/foryou", "allowedDomains": ["tiktok.com"] } }"#,
        );
        let service = settings.last_service.expect("the open service survives");
        assert_eq!(service.allowed_domains, vec!["tiktok.com".to_string()]);
        assert!(service.sign_in_hosts.is_empty());
        assert_eq!(settings.opacity, 0.5);
    }

    #[test]
    fn a_file_from_before_tiles_has_no_tiles_and_shows_the_notice() {
        let settings = parse(r#"{ "version": 1, "opacity": 0.5 }"#);
        assert!(!settings.notice_accepted);
        assert!(settings.custom_tiles.is_empty());
        assert_eq!(settings.last_service, None);
        assert_eq!(settings.hotkeys.play_pause, "Ctrl+Alt+Shift+Space");
    }

    #[test]
    fn a_file_from_before_the_settings_panel_gets_default_preferences() {
        let settings = parse(r#"{ "version": 1, "opacity": 0.5 }"#);
        assert_eq!(settings.language, Language::System);
        assert_eq!(
            settings.shorts,
            Shorts {
                auto: false,
                pause_seconds: 1.0,
                hold_on_hover: true,
                portrait_size: PortraitSize::Rotated,
            }
        );
        assert_eq!(settings.floaty_portrait, None);
        assert!(!settings.update_check);
    }

    #[test]
    fn a_file_without_video_only_has_it_off() {
        let settings = parse(r#"{ "version": 1, "opacity": 0.5 }"#);
        assert!(!settings.video_only);
        assert_eq!(settings.hotkeys.video_only, "Ctrl+Alt+Shift+V");
    }

    #[test]
    fn video_only_survives_a_round_trip() {
        assert!(parse(r#"{ "videoOnly": true }"#).video_only);
        let settings = Settings {
            video_only: true,
            ..Settings::default()
        };
        let written = to_json(&settings);
        assert!(written.contains(r#""videoOnly": true"#), "{written}");
        assert_eq!(parse(&written), settings);
    }

    #[test]
    fn a_file_without_zoom_has_it_off() {
        let settings = parse(r#"{ "version": 1, "opacity": 0.5 }"#);
        assert!(!settings.zoom);
        assert_eq!(settings.hotkeys.zoom, "Ctrl+Alt+Shift+Z");
    }

    #[test]
    fn zoom_survives_a_round_trip() {
        assert!(parse(r#"{ "zoom": true }"#).zoom);
        let settings = Settings {
            zoom: true,
            ..Settings::default()
        };
        let written = to_json(&settings);
        assert!(written.contains(r#""zoom": true"#), "{written}");
        assert_eq!(parse(&written), settings);
    }

    #[test]
    fn a_file_without_always_on_top_keeps_floawty_on_top() {
        let settings = parse(r#"{ "version": 1, "opacity": 0.5 }"#);
        assert!(settings.always_on_top);
        assert_eq!(settings.hotkeys.always_on_top, "Ctrl+Alt+Shift+T");
    }

    #[test]
    fn always_on_top_off_survives_a_round_trip() {
        let off = Settings {
            always_on_top: false,
            ..Settings::default()
        };
        assert!(to_json(&off).contains(r#""alwaysOnTop": false"#));
        assert_eq!(parse(&to_json(&off)), off);
    }

    #[test]
    fn an_unknown_language_follows_windows_and_keeps_the_rest() {
        let settings = parse(r#"{ "opacity": 0.5, "language": "klingon" }"#);
        assert_eq!(settings.language, Language::System);
        assert_eq!(settings.opacity, 0.5);
    }

    #[test]
    fn the_theme_follows_windows_unless_light_or_dark_is_chosen() {
        assert_eq!(parse(r#"{ "version": 1 }"#).theme, Theme::System);
        assert_eq!(parse(r#"{ "theme": "light" }"#).theme, Theme::Light);
        assert_eq!(parse(r#"{ "theme": "dark" }"#).theme, Theme::Dark);
        let unknown = parse(r#"{ "opacity": 0.5, "theme": "sepia" }"#);
        assert_eq!((unknown.theme, unknown.opacity), (Theme::System, 0.5));
    }

    #[test]
    fn preferences_survive_a_round_trip() {
        let mut settings = Settings::default();
        apply_preferences(
            &mut settings,
            Preferences {
                language: Language::De,
                theme: Theme::Dark,
                shorts: Shorts {
                    auto: true,
                    pause_seconds: 2.5,
                    hold_on_hover: false,
                    portrait_size: PortraitSize::Separate,
                },
                update_check: true,
            },
        );
        let text = to_json(&settings);
        assert!(text.contains(r#""language": "de""#), "{text}");
        assert!(text.contains(r#""theme": "dark""#), "{text}");
        assert_eq!(parse(&text), settings);
    }

    #[test]
    fn the_shorts_pause_stays_between_0_and_10_seconds() {
        let pause_after = |seconds: f64| {
            let mut settings = Settings::default();
            let shorts = Shorts {
                auto: true,
                pause_seconds: seconds,
                ..Shorts::default()
            };
            apply_preferences(
                &mut settings,
                Preferences {
                    language: Language::En,
                    theme: Theme::System,
                    shorts,
                    update_check: false,
                },
            );
            settings.shorts.pause_seconds
        };
        assert_eq!(pause_after(99.0), 10.0);
        assert_eq!(pause_after(-1.0), 0.0);
        assert_eq!(pause_after(f64::NAN), 1.0);
        assert_eq!(
            parse(r#"{ "shorts": { "pauseSeconds": 60 } }"#)
                .shorts
                .pause_seconds,
            10.0
        );
    }

    #[test]
    fn an_unknown_portrait_size_is_read_as_rotated() {
        let settings = parse(r#"{ "shorts": { "portraitSize": "diagonal", "auto": true } }"#);
        assert_eq!(settings.shorts.portrait_size, PortraitSize::Rotated);
        assert!(settings.shorts.auto);
    }

    #[test]
    fn the_separate_portrait_size_is_written_in_lowercase() {
        let mut settings = Settings::default();
        settings.shorts.portrait_size = PortraitSize::Separate;
        assert!(to_json(&settings).contains(r#""portraitSize": "separate""#));
    }

    #[test]
    fn a_saved_portrait_rect_survives_a_round_trip() {
        let settings = Settings {
            floaty_portrait: Some(Rect {
                x: 1634,
                y: 544,
                width: 360,
                height: 640,
            }),
            ..Settings::default()
        };
        let text = to_json(&settings);
        assert!(text.contains(r#""floatyPortrait""#), "{text}");
        assert_eq!(parse(&text), settings);
    }

    #[test]
    fn out_of_range_opacity_is_clamped_on_load() {
        assert_eq!(parse(r#"{ "opacity": 0.01 }"#).opacity, opacity::MIN);
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
    fn graphics_acceleration_is_on_unless_turned_off() {
        assert!(parse(r#"{ "version": 1, "opacity": 0.5 }"#).graphics_acceleration);
        let off = Settings {
            graphics_acceleration: false,
            ..Settings::default()
        };
        assert!(to_json(&off).contains("\"graphicsAcceleration\": false"));
        assert_eq!(parse(&to_json(&off)), off);
    }
}
