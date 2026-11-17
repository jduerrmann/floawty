//! Reads and writes the settings file; a broken file is kept, never silently overwritten.
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use crate::settings::{self, Settings};

pub fn load(path: &Path) -> Settings {
    let Ok(text) = fs::read_to_string(path) else {
        return Settings::default();
    };
    if serde_json::from_str::<serde_json::Value>(&text).is_err() {
        // Keep what the user had; the next save would overwrite it otherwise.
        let _ = fs::copy(path, with_suffix(path, ".broken"));
    }
    settings::parse(&text)
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
