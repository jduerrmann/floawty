//! Updates: check GitHub, install by click or on quit, or open the release page.
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Manager};
use tauri_plugin_updater::{Error, Update, UpdaterExt};
use url::Url;

use crate::auto_update::quit_install;
use crate::distribution::Build;
use crate::overlay::Overlay;
use crate::{logbook, service};

const RELEASE_PAGE: &str = "https://github.com/jduerrmann/floawty/releases/latest";
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const READ_TIMEOUT: Duration = Duration::from_secs(30);
const CHECK_TIMEOUT: Duration = Duration::from_secs(30);

#[derive(Default)]
pub struct Updates {
    found: Mutex<Option<Update>>,
    installing: AtomicBool,
    ready: Mutex<Option<Ready>>,
}

/// An update the automatic check downloaded and verified; it installs when the user quits.
pub struct Ready {
    update: Update,
    bytes: Vec<u8>,
}

impl Updates {
    pub fn ready_version(&self) -> Option<String> {
        let ready = self.ready.lock().unwrap();
        ready.as_ref().map(|ready| ready.update.version.clone())
    }

    pub fn set_ready(&self, update: Update, bytes: Vec<u8>) {
        *self.ready.lock().unwrap() = Some(Ready { update, bytes });
    }

    pub fn take_ready(&self) -> Option<Ready> {
        self.ready.lock().unwrap().take()
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheck {
    current: String,
    latest: Option<String>,
    installed: bool,
}

/// The code the settings page maps to a hint; the error's own text only goes to the log.
fn error_code(error: &Error) -> &'static str {
    match error {
        Error::Reqwest(_) | Error::Network(_) => "offline",
        Error::ReleaseNotFound => "unavailable",
        Error::Minisign(_)
        | Error::Base64(_)
        | Error::SignatureUtf8(_)
        | Error::SignedVersionMismatch { .. }
        | Error::MissingSignedVersion => "signature",
        _ => "failed",
    }
}

pub fn failure_message(what: &str, error: &Error) -> String {
    let code = error_code(error);
    if code == "failed" {
        format!("{what} failed: {error}")
    } else {
        format!("{what} failed: {code}")
    }
}

/// The installer restarts floawty after a click; after a quit it stays closed.
pub async fn find_update(
    app: &AppHandle,
    restart_after_install: bool,
) -> Result<Option<Update>, Error> {
    let updater = app
        .updater_builder()
        .restart_after_install(restart_after_install)
        .timeout(CHECK_TIMEOUT)
        .configure_client(|client| {
            client
                .connect_timeout(CONNECT_TIMEOUT)
                .read_timeout(READ_TIMEOUT)
        })
        .build()?;
    let mut update = updater.check().await?;
    // The total cap is for the small manifest; a large download is only bounded by stalls.
    if let Some(update) = update.as_mut() {
        update.timeout = None;
    }
    Ok(update)
}

#[tauri::command]
pub async fn check_for_update(app: AppHandle) -> Result<UpdateCheck, String> {
    // Only what the last check found may install, never an older result.
    app.state::<Updates>().found.lock().unwrap().take();
    let update = match find_update(&app, true).await {
        Ok(update) => update,
        Err(error) => {
            logbook::write(&app, &failure_message("update check", &error));
            return Err(error_code(&error).to_owned());
        }
    };
    let latest = update.as_ref().map(|update| update.version.clone());
    match &latest {
        Some(version) => logbook::write(&app, &format!("update check: {version} available")),
        None => logbook::write(&app, "update check: up to date"),
    }
    *app.state::<Updates>().found.lock().unwrap() = update;
    Ok(UpdateCheck {
        current: app.package_info().version.to_string(),
        latest,
        installed: Build::current() == Build::Installed,
    })
}

/// On success the plugin starts the setup and exits floawty, so this only returns on failure.
#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<(), String> {
    if Build::current() != Build::Installed {
        return Err("portable".to_owned());
    }
    let updates = app.state::<Updates>();
    if updates.installing.swap(true, Ordering::SeqCst) {
        return Err("busy".to_owned());
    }
    let found = updates.found.lock().unwrap().clone();
    let Some(update) = found else {
        updates.installing.store(false, Ordering::SeqCst);
        logbook::write(&app, "update install: nothing was found to install");
        return Err("failed".to_owned());
    };
    logbook::write(
        &app,
        &format!("update install: {} downloading", update.version),
    );
    let result = update.download_and_install(|_, _| {}, || {}).await;
    if let Err(error) = result {
        updates.installing.store(false, Ordering::SeqCst);
        logbook::write(&app, &failure_message("update install", &error));
        return Err(error_code(&error).to_owned());
    }
    Ok(())
}

/// The user's quit (bar, window close): installs a downloaded update first, else just exits.
/// floawty's own restarts and Windows' shutdown never come through here.
pub fn quit(app: &AppHandle) {
    let ready = app.state::<Updates>().take_ready();
    let automatic = app.state::<Overlay>().settings().update_check;
    let installed = Build::current() == Build::Installed;
    if let Some(ready) = quit_install(installed, automatic, ready) {
        let version = &ready.update.version;
        logbook::write(app, &format!("installing update {version} on quit"));
        // On success the plugin starts the setup and exits floawty; only a failure continues.
        if let Err(error) = ready.update.install(&ready.bytes) {
            logbook::write(app, &failure_message("update install on quit", &error));
        }
    }
    app.exit(0);
}

/// The address is fixed here; the page never passes one.
#[tauri::command]
pub fn open_release_page() {
    service::open_in_browser(&Url::parse(RELEASE_PAGE).expect("the release page is a URL"));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_failed_download_means_offline() {
        assert_eq!(error_code(&Error::Network("timed out".into())), "offline");
    }

    #[test]
    fn a_missing_or_unreadable_manifest_means_unavailable() {
        assert_eq!(error_code(&Error::ReleaseNotFound), "unavailable");
    }

    #[test]
    fn a_bad_signature_means_signature() {
        assert_eq!(error_code(&Error::SignatureUtf8("x".into())), "signature");
        let mismatch = Error::SignedVersionMismatch {
            signed: "0.1.0".into(),
            announced: "0.1.1".into(),
        };
        assert_eq!(error_code(&mismatch), "signature");
        assert_eq!(error_code(&Error::MissingSignedVersion), "signature");
    }

    #[test]
    fn anything_else_means_failed() {
        assert_eq!(error_code(&Error::InvalidUpdaterFormat), "failed");
        assert_eq!(error_code(&Error::EmptyEndpoints), "failed");
    }

    #[test]
    fn only_an_unclassified_failure_logs_the_errors_own_text() {
        assert_eq!(
            failure_message("update check", &Error::InvalidUpdaterFormat),
            "update check failed: invalid updater binary format"
        );
        assert_eq!(
            failure_message("update check", &Error::ReleaseNotFound),
            "update check failed: unavailable"
        );
    }

    #[test]
    fn the_check_result_is_camel_case() {
        let check = UpdateCheck {
            current: "0.1.0".into(),
            latest: Some("0.1.1".into()),
            installed: true,
        };
        assert_eq!(
            serde_json::to_string(&check).unwrap(),
            r#"{"current":"0.1.0","latest":"0.1.1","installed":true}"#
        );
    }
}
