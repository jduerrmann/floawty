//! Reads and writes the settings file; a broken file is kept, never silently overwritten.
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use crate::settings::{self, Settings};

pub fn load(path: &Path) -> Settings {
    let Ok(text) = fs::read_to_string(path) else {
        return Settings::default();
    };
    if let Some(suffix) = copy_suffix(&text) {
        // Keep what the user had; the next save would overwrite it otherwise.
        let _ = fs::copy(path, with_suffix(path, suffix));
    }
    settings::parse(&text)
}

/// Which copy a file needs before the next save: `.newer` for a newer floawty's file,
/// `.broken` for text that is no JSON or has a value of the wrong type.
fn copy_suffix(text: &str) -> Option<&'static str> {
    let Ok(value) = serde_json::from_str::<serde_json::Value>(text) else {
        return Some(".broken");
    };
    let version = value.get("version").and_then(serde_json::Value::as_u64);
    if version.is_some_and(|version| version > u64::from(settings::CURRENT_VERSION)) {
        return Some(".newer");
    }
    serde_json::from_value::<Settings>(value)
        .is_err()
        .then_some(".broken")
}

/// Writes to a temporary file first, so a crash never leaves half a settings file.
pub fn save(path: &Path, settings: &Settings) -> io::Result<()> {
    if let Some(folder) = path.parent() {
        fs::create_dir_all(folder)?;
    }
    let temporary = with_suffix(path, ".tmp");
    fs::write(&temporary, settings::to_json(settings))?;
    fs::rename(&temporary, path)
}

fn with_suffix(path: &Path, suffix: &str) -> PathBuf {
    let mut name = path.as_os_str().to_owned();
    name.push(suffix);
    PathBuf::from(name)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_file(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("floawty-test-{}-{name}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir.join("settings.json")
    }

    #[test]
    fn a_missing_file_gives_defaults() {
        assert_eq!(load(&temp_file("missing")), Settings::default());
    }

    #[test]
    fn saved_settings_load_again() {
        let path = temp_file("roundtrip");
        let settings = Settings {
            opacity: 0.4,
            ..Settings::default()
        };
        save(&path, &settings).unwrap();
        assert_eq!(load(&path), settings);
    }

    #[test]
    fn a_broken_file_is_kept_next_to_the_defaults() {
        let path = temp_file("broken");
        fs::write(&path, "{ broken").unwrap();
        assert_eq!(load(&path), Settings::default());
        assert_eq!(
            fs::read_to_string(with_suffix(&path, ".broken")).unwrap(),
            "{ broken"
        );
    }

    #[test]
    fn unknown_keys_survive_a_load_and_a_save() {
        let path = temp_file("unknown");
        let text = r#"{ "version": 1, "opacity": 0.5, "futureThing": { "a": [1, 2] } }"#;
        fs::write(&path, text).unwrap();
        save(&path, &load(&path)).unwrap();
        let written: serde_json::Value =
            serde_json::from_str(&fs::read_to_string(&path).unwrap()).unwrap();
        assert_eq!(written["futureThing"]["a"][1], 2);
        assert_eq!(written["opacity"], 0.5);
    }

    #[test]
    fn a_file_from_a_newer_floawty_is_kept_aside_before_it_is_overwritten() {
        let path = temp_file("newer");
        let text = r#"{ "version": 2, "opacity": 0.5 }"#;
        fs::write(&path, text).unwrap();
        assert_eq!(load(&path).opacity, 0.5);
        assert_eq!(
            fs::read_to_string(with_suffix(&path, ".newer")).unwrap(),
            text
        );
        assert!(!with_suffix(&path, ".broken").exists());
    }

    #[test]
    fn a_newer_files_extra_keys_stay_in_the_copy_not_in_the_saved_file() {
        let path = temp_file("newer-extra");
        fs::write(
            &path,
            r#"{ "version": 2, "opacity": 0.5, "futureThing": 1 }"#,
        )
        .unwrap();
        save(&path, &load(&path)).unwrap();
        let written: serde_json::Value =
            serde_json::from_str(&fs::read_to_string(&path).unwrap()).unwrap();
        assert_eq!(written["version"], 1);
        assert_eq!(written["opacity"], 0.5);
        assert!(written.get("futureThing").is_none());
        assert!(fs::read_to_string(with_suffix(&path, ".newer"))
            .unwrap()
            .contains("futureThing"));
    }

    #[test]
    fn valid_json_with_a_wrong_type_is_kept_aside_next_to_the_defaults() {
        let path = temp_file("wrong-type");
        let text = r#"{ "version": 1, "opacity": "high", "zoom": true }"#;
        fs::write(&path, text).unwrap();
        assert_eq!(load(&path), Settings::default());
        assert_eq!(
            fs::read_to_string(with_suffix(&path, ".broken")).unwrap(),
            text
        );
    }

    #[test]
    fn a_good_file_leaves_no_copy_behind() {
        let path = temp_file("good");
        save(&path, &Settings::default()).unwrap();
        load(&path);
        assert!(!with_suffix(&path, ".broken").exists());
        assert!(!with_suffix(&path, ".newer").exists());
    }

    #[test]
    fn saving_creates_the_folder() {
        let path = temp_file("folder")
            .parent()
            .unwrap()
            .join("new")
            .join("settings.json");
        save(&path, &Settings::default()).unwrap();
        assert!(settings::parse(&fs::read_to_string(&path).unwrap()) == Settings::default());
    }
}
