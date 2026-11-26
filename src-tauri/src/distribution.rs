//! How this floawty was shipped, and the native message when WebView2 is missing.
use tauri::utils::{config::BundleType, platform};
use url::Url;

use crate::service;

const DOWNLOAD_PAGE: &str = "https://developer.microsoft.com/microsoft-edge/webview2/";
// The primary language bits of a Windows LANGID; German is 0x07.
const PRIMARY_LANGUAGE_MASK: u16 = 0x3ff;
const LANG_GERMAN: u16 = 0x07;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Build {
    Installed,
    Portable,
}

impl Build {
    pub fn current() -> Self {
        Self::from_bundle(platform::bundle_type())
    }

    /// Only the setup patches its exe; anything unclear counts as portable.
    fn from_bundle(bundle: Option<BundleType>) -> Self {
        match bundle {
            Some(BundleType::Nsis) => Self::Installed,
            _ => Self::Portable,
        }
    }

    pub fn name(self) -> &'static str {
        match self {
            Self::Installed => "installed",
            Self::Portable => "portable",
        }
    }
}

// Without a runtime the loader returns an error or, in older versions, an empty string.
pub fn installed_webview(version: Option<String>) -> Option<String> {
    version.filter(|version| !version.trim().is_empty())
}

fn missing_webview_text(german: bool) -> String {
    if german {
        format!(
            "floawty braucht die Microsoft Edge WebView2 Runtime, die auf diesem PC fehlt.\n\n\
             {DOWNLOAD_PAGE}\n\nJetzt die Download-Seite von Microsoft öffnen?"
        )
    } else {
        format!(
            "floawty needs the Microsoft Edge WebView2 Runtime, which is missing on this PC.\n\n\
             {DOWNLOAD_PAGE}\n\nOpen Microsoft's download page now?"
        )
    }
}

fn is_german(language: u16) -> bool {
    language & PRIMARY_LANGUAGE_MASK == LANG_GERMAN
}

/// Asks whether to open Microsoft's download page; floawty cannot start without WebView2.
pub fn explain_missing_webview() {
    use windows_sys::Win32::Globalization::GetUserDefaultUILanguage;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        MessageBoxW, IDYES, MB_ICONWARNING, MB_YESNO,
    };
    // SAFETY: a plain query without arguments.
    let german = is_german(unsafe { GetUserDefaultUILanguage() });
    let wide = |text: &str| text.encode_utf16().chain(Some(0)).collect::<Vec<u16>>();
    let (text, title) = (wide(&missing_webview_text(german)), wide("floawty"));
    // SAFETY: both strings are NUL-terminated and live until the call returns.
    let answer = unsafe {
        MessageBoxW(
            std::ptr::null_mut(),
            text.as_ptr(),
            title.as_ptr(),
            MB_YESNO | MB_ICONWARNING,
        )
    };
    if answer == IDYES {
        service::open_in_browser(&Url::parse(DOWNLOAD_PAGE).expect("the download page is a URL"));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_the_setup_build_counts_as_installed() {
        assert_eq!(Build::from_bundle(Some(BundleType::Nsis)), Build::Installed);
    }

    #[test]
    fn an_unpatched_or_other_build_counts_as_portable() {
        assert_eq!(Build::from_bundle(None), Build::Portable);
        assert_eq!(Build::from_bundle(Some(BundleType::Msi)), Build::Portable);
    }

    #[test]
    fn a_webview_version_means_floawty_can_start() {
        let version = Some("142.0.3595.53".to_owned());
        assert_eq!(installed_webview(version.clone()), version);
    }

    #[test]
    fn no_or_an_empty_webview_version_means_it_is_missing() {
        assert_eq!(installed_webview(None), None);
        assert_eq!(installed_webview(Some(" ".to_owned())), None);
    }

    #[test]
    fn german_windows_gets_the_german_message() {
        assert!(is_german(0x0407));
        assert!(is_german(0x0807));
        assert!(!is_german(0x0409));
        assert!(missing_webview_text(true).starts_with("floawty braucht"));
    }

    #[test]
    fn the_message_names_the_download_page_in_both_languages() {
        for german in [false, true] {
            assert!(missing_webview_text(german).contains(DOWNLOAD_PAGE));
        }
        assert!(missing_webview_text(false).starts_with("floawty needs"));
    }
}
