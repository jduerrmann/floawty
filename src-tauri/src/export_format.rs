//! The settings file format: what an export holds and how an import is checked.
use std::collections::HashSet;

use serde::Serialize;
use serde_json::Value;

use crate::awake::KeepAwake;
use crate::hotkeys;
use crate::settings::{
    self, CustomTile, Hotkeys, Language, Settings, Shorts, Theme, CURRENT_VERSION,
};

const KIND: &str = "floawty-settings";
const MAX_TILE_NAME: usize = 40;
/// Keys the file may carry; everything else in `settings.json` stays on this PC.
const ALLOWED_KEYS: [&str; 13] = [
    "opacity",
    "hotkeys",
    "customTiles",
    "language",
    "theme",
    "animations",
    "shorts",
    "videoOnly",
    "zoom",
    "graphicsAcceleration",
    "alwaysOnTop",
    "fullscreenInWindow",
    "keepAwake",
];
/// Keys whose value is an object; serde would also read an array as one.
const OBJECT_KEYS: [&str; 2] = ["hotkeys", "shorts"];
/// Words of enums that read an unknown word as their default; the file may only use known ones.
const WORD_POINTERS: [&str; 4] = ["/language", "/theme", "/keepAwake", "/shorts/portraitSize"];

#[derive(Debug, PartialEq, Eq)]
pub enum ImportError {
    Broken,
    NotExport,
    NewerVersion,
    InvalidHotkey,
    InvalidTile,
}

impl ImportError {
    /// The code the settings page maps to a text.
    pub fn code(&self) -> &'static str {
        match self {
            Self::Broken => "broken",
            Self::NotExport => "notExport",
            Self::NewerVersion => "newerVersion",
            Self::InvalidHotkey => "invalidHotkey",
            Self::InvalidTile => "invalidTile",
        }
    }
}

/// The export file; the field order is the order in the file.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Export<'a> {
    kind: &'static str,
    version: u32,
    opacity: f64,
    hotkeys: &'a Hotkeys,
    custom_tiles: &'a [CustomTile],
    language: Language,
    theme: Theme,
    animations: bool,
    shorts: &'a Shorts,
    video_only: bool,
    zoom: bool,
    graphics_acceleration: bool,
    always_on_top: bool,
    fullscreen_in_window: bool,
    keep_awake: KeepAwake,
}

pub fn export_text(settings: &Settings) -> String {
    let export = Export {
        kind: KIND,
        version: CURRENT_VERSION,
        opacity: settings.opacity,
        hotkeys: &settings.hotkeys,
        custom_tiles: &settings.custom_tiles,
        language: settings.language,
        theme: settings.theme,
        animations: settings.animations,
        shorts: &settings.shorts,
        video_only: settings.video_only,
        zoom: settings.zoom,
        graphics_acceleration: settings.graphics_acceleration,
        always_on_top: settings.always_on_top,
        fullscreen_in_window: settings.fullscreen_in_window,
        keep_awake: settings.keep_awake,
    };
    let mut text = serde_json::to_string_pretty(&export).expect("an export always serializes");
    text.push('\n');
    text
}

/// The current settings with the file's allow-listed keys over them, or why the file is refused.
pub fn check_import(text: &str, current: &Settings) -> Result<Settings, ImportError> {
    // Notepad may save a byte order mark.
    let file: Value = serde_json::from_str(text.trim_start_matches('\u{feff}'))
        .map_err(|_| ImportError::Broken)?;
    if !file.is_object() {
        return Err(ImportError::Broken);
    }
    if file.get("kind").and_then(Value::as_str) != Some(KIND) {
        return Err(ImportError::NotExport);
    }
    match file.get("version").and_then(Value::as_u64) {
        Some(version) if version > u64::from(CURRENT_VERSION) => {
            return Err(ImportError::NewerVersion)
        }
        Some(version) if version >= 1 => {}
        _ => return Err(ImportError::Broken),
    }
    if !well_shaped(&file) {
        return Err(ImportError::Broken);
    }
    let Value::Object(mut merged) = serde_json::to_value(current).expect("settings serialize")
    else {
        unreachable!("settings serialize as an object");
    };
    for key in ALLOWED_KEYS {
        if let Some(value) = file.get(key) {
            merged.insert(key.into(), value.clone());
        }
    }
    let mut imported: Settings =
        serde_json::from_value(Value::Object(merged)).map_err(|_| ImportError::Broken)?;
    if !words_known(&file, &imported) {
        return Err(ImportError::Broken);
    }
    settings::migrate(&mut imported);
    if !hotkeys::usable(&imported.hotkeys) {
        return Err(ImportError::InvalidHotkey);
    }
    imported.custom_tiles = checked_tiles(imported.custom_tiles)?;
    Ok(imported)
}

/// Serde reads an array as a struct, so objects and the tile list are checked by hand.
fn well_shaped(file: &Value) -> bool {
    let objects = OBJECT_KEYS
        .iter()
        .all(|key| file.get(*key).is_none_or(Value::is_object));
    let tiles = file.get("customTiles").is_none_or(|tiles| {
        tiles
            .as_array()
            .is_some_and(|tiles| tiles.iter().all(Value::is_object))
    });
    objects && tiles
}

/// An unknown word became the enum's default; read back, it differs from the file's.
fn words_known(file: &Value, imported: &Settings) -> bool {
    let read_back = serde_json::to_value(imported).expect("settings serialize");
    WORD_POINTERS.iter().all(|pointer| {
        file.pointer(pointer)
            .is_none_or(|word| read_back.pointer(pointer) == Some(word))
    })
}

/// The panel's rules for own tiles: `custom-N` ids, a name, a web address with a dotted host.
fn checked_tiles(tiles: Vec<CustomTile>) -> Result<Vec<CustomTile>, ImportError> {
    let (mut ids, mut urls) = (HashSet::new(), HashSet::new());
    tiles
        .into_iter()
        .map(|tile| {
            let tile = checked_tile(tile).ok_or(ImportError::InvalidTile)?;
            let fresh = ids.insert(tile.id.clone()) & urls.insert(tile.url.clone());
            fresh.then_some(tile).ok_or(ImportError::InvalidTile)
        })
        .collect()
}

fn checked_tile(tile: CustomTile) -> Option<CustomTile> {
    let number = tile.id.strip_prefix("custom-")?;
    let canonical = number
        .parse::<u32>()
        .is_ok_and(|n| n >= 1 && n.to_string() == number);
    let name = tile.name.trim();
    if !canonical || name.is_empty() || name.chars().count() > MAX_TILE_NAME {
        return None;
    }
    Some(CustomTile {
        id: tile.id,
        name: name.into(),
        url: web_address(&tile.url)?,
    })
}

fn web_address(text: &str) -> Option<String> {
    if text.chars().any(char::is_whitespace) {
        return None;
    }
    let url = url::Url::parse(text).ok()?;
    let web = matches!(url.scheme(), "http" | "https");
    (web && url.host_str().is_some_and(|host| host.contains('.'))).then(|| url.into())
}

/// Puts the allow-listed values of `from` into `to`; nothing else of `to` changes.
pub fn copy_allowed(to: &mut Settings, from: &Settings) {
    to.opacity = from.opacity;
    to.hotkeys = from.hotkeys.clone();
    to.custom_tiles = from.custom_tiles.clone();
    to.language = from.language;
    to.theme = from.theme;
    to.animations = from.animations;
    to.shorts = from.shorts.clone();
    to.video_only = from.video_only;
    to.zoom = from.zoom;
    to.graphics_acceleration = from.graphics_acceleration;
    to.always_on_top = from.always_on_top;
    to.fullscreen_in_window = from.fullscreen_in_window;
    to.keep_awake = from.keep_awake;
}

#[cfg(test)]
#[path = "export_format_tests.rs"]
mod tests;
