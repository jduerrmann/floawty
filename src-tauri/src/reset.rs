//! "Reset all data": the profile is in use while floawty runs, so the wipe happens at the next start.
use std::fs;
use std::io;
use std::path::Path;
use std::thread;
use std::time::Duration;

const MARKER: &str = "reset-requested";
// The old WebView2 processes may still hold profile files for a moment after a restart.
const ATTEMPTS: u32 = 20;
const RETRY_DELAY: Duration = Duration::from_millis(150);

/// Remembers the wish; `apply_if_requested` does the work before any webview starts.
pub fn request(data_dir: &Path) -> io::Result<()> {
    fs::create_dir_all(data_dir)?;
    fs::write(data_dir.join(MARKER), "")
}

/// Deletes floawty's folder and the WebView2 profile if a reset was requested.
/// Returns whether a reset happened; a profile that stays locked keeps the request.
pub fn apply_if_requested(data_dir: &Path, profile_dir: &Path) -> io::Result<bool> {
    if !data_dir.join(MARKER).exists() {
        return Ok(false);
    }
    remove_with_retries(profile_dir)?;
    remove_with_retries(data_dir)?;
    Ok(true)
}

fn remove_with_retries(dir: &Path) -> io::Result<()> {
    let mut attempt = 1;
    loop {
        match fs::remove_dir_all(dir) {
            Ok(()) => return Ok(()),
            Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(()),
            Err(error) if attempt >= ATTEMPTS => return Err(error),
            Err(_) => thread::sleep(RETRY_DELAY),
        }
        attempt += 1;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn folders(name: &str) -> (PathBuf, PathBuf) {
        let root =
            std::env::temp_dir().join(format!("floawty-reset-{}-{name}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        let (data, profile) = (root.join("data"), root.join("profile"));
        fs::create_dir_all(data.join("logs")).unwrap();
        fs::create_dir_all(profile.join("EBWebView")).unwrap();
        fs::write(data.join("settings.json"), "{}").unwrap();
        fs::write(profile.join("EBWebView").join("Cookies"), "secret").unwrap();
        (data, profile)
    }

    #[test]
    fn without_a_request_nothing_is_deleted() {
        let (data, profile) = folders("none");
        assert!(!apply_if_requested(&data, &profile).unwrap());
        assert!(data.join("settings.json").exists());
        assert!(profile.join("EBWebView").join("Cookies").exists());
    }

    #[test]
    fn a_request_deletes_settings_logs_and_the_profile_once() {
        let (data, profile) = folders("requested");
        request(&data).unwrap();
        assert!(apply_if_requested(&data, &profile).unwrap());
        assert!(!data.exists());
        assert!(!profile.exists());
        assert!(!apply_if_requested(&data, &profile).unwrap());
    }

    #[test]
    fn a_missing_profile_folder_is_no_error() {
        let (data, profile) = folders("no-profile");
        fs::remove_dir_all(&profile).unwrap();
        request(&data).unwrap();
        assert!(apply_if_requested(&data, &profile).unwrap());
        assert!(!data.exists());
    }
}
