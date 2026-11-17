//! The local log (AGENTS.md rule 8): `%APPDATA%\floawty\logs\floawty.log`, never sent anywhere.
use std::fs::{self, OpenOptions};
use std::io::{self, Write};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::AppHandle;

use crate::paths;

const SECONDS_PER_DAY: u64 = 86_400;

pub fn startup_message(app_version: &str, webview_version: Option<&str>) -> String {
    let webview = webview_version.unwrap_or("unknown");
    format!("floawty {app_version} started, WebView2 {webview}")
}

/// Prefixes a message with its UTC time; `unix_seconds` is UTC.
pub fn stamped(unix_seconds: u64, message: &str) -> String {
    format!("{} {message}", iso_utc(unix_seconds))
}

/// Appends one line; a log that cannot be written must never stop floawty.
pub fn write(app: &AppHandle, message: &str) {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.as_secs());
    let _ = append(app, &stamped(now, message));
}

fn append(app: &AppHandle, line: &str) -> io::Result<()> {
    let folder = log_folder(app)?;
    fs::create_dir_all(&folder)?;
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(folder.join("floawty.log"))?;
    writeln!(file, "{line}")
}

fn log_folder(app: &AppHandle) -> io::Result<PathBuf> {
    Ok(paths::floawty_dir(app)?.join("logs"))
}

fn iso_utc(unix_seconds: u64) -> String {
    let (year, month, day) = civil_date(unix_seconds / SECONDS_PER_DAY);
    let time = unix_seconds % SECONDS_PER_DAY;
    let (hour, minute, second) = (time / 3600, time % 3600 / 60, time % 60);
    format!("{year:04}-{month:02}-{day:02}T{hour:02}:{minute:02}:{second:02}Z")
}

// Howard Hinnant's days-to-civil algorithm, so no date library is needed for one line.
fn civil_date(days_since_epoch: u64) -> (u64, u64, u64) {
    let z = days_since_epoch + 719_468;
    let era = z / 146_097;
    let day_of_era = z % 146_097;
    let year_of_era =
        (day_of_era - day_of_era / 1460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_index = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * month_index + 2) / 5 + 1;
    let month = if month_index < 10 {
        month_index + 3
    } else {
        month_index - 9
    };
    let year = year_of_era + era * 400 + u64::from(month <= 2);
    (year, month, day)
}

#[cfg(test)]
mod tests {
    use super::{stamped, startup_message};

    #[test]
    fn names_time_app_and_webview_versions() {
        let line = stamped(
            1_794_934_800,
            &startup_message("0.1.0", Some("157.0.4341.46")),
        );
        assert_eq!(
            line,
            "2026-11-17T17:00:00Z floawty 0.1.0 started, WebView2 157.0.4341.46"
        );
    }

    #[test]
    fn says_so_when_webview_version_is_unknown() {
        let line = stamped(0, &startup_message("0.1.0", None));
        assert_eq!(
            line,
            "1970-01-01T00:00:00Z floawty 0.1.0 started, WebView2 unknown"
        );
    }

    #[test]
    fn handles_leap_days() {
        let line = stamped(1_709_164_800, "x");
        assert!(line.starts_with("2024-02-29T00:00:00Z"), "{line}");
    }
}
