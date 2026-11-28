//! What the main window knows besides its geometry: settings, modes, page problems, updates.
use std::path::PathBuf;
use std::sync::atomic::AtomicU64;
use std::sync::Mutex;

use tauri::AppHandle;

use crate::awake::KeepAwake;
use crate::distribution::Build;
use crate::geometry::{Aspect, Rect};
use crate::logbook;
use crate::mode::Mode;
use crate::page::Problem;
use crate::persistence;
use crate::settings::{Hotkeys, Language, OpenService, Settings, Shorts, Theme};

pub struct Overlay {
    pub(super) settings: Mutex<Settings>,
    pub(super) settings_path: PathBuf,
    pub(super) click_through: Mutex<bool>,
    pub(super) settings_open: Mutex<bool>,
    pub(super) settle_generation: AtomicU64,
    /// What the service page shows now; the floaty view turns with it.
    pub(super) aspect: Mutex<Aspect>,
    /// The landscape view before it turned upright, restored unless the user changed the upright one.
    pub(super) before_turn: Mutex<Option<Rect>>,
    pub(super) turned_to: Mutex<Option<Rect>>,
    /// Size after the last settle, to tell which edge the user dragged.
    pub(super) settled: Mutex<Option<(u32, u32)>>,
    pub(super) page_problems: Mutex<Vec<Problem>>,
    /// The service whose webview waits, out of sight, for its first document.
    pub(super) opening: Mutex<Option<OpenService>>,
    /// The version the automatic check found, and whether it is downloaded.
    pub(super) update: Mutex<(Option<String>, bool)>,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayState {
    pub mode: Mode,
    pub opacity: f64,
    pub click_through: bool,
    pub service_id: Option<String>,
    pub settings_open: bool,
    pub hotkeys: Hotkeys,
    pub language: Language,
    pub theme: Theme,
    pub animations: bool,
    pub shorts: Shorts,
    pub update_check: bool,
    pub graphics_acceleration: bool,
    pub video_only: bool,
    pub zoom: bool,
    pub always_on_top: bool,
    pub fullscreen_in_window: bool,
    pub page_problems: Vec<Problem>,
    pub opening: Option<String>,
    pub keep_awake: KeepAwake,
    pub update_found: Option<String>,
    pub update_ready: bool,
    pub portable: bool,
}

impl Overlay {
    pub fn load(settings_path: PathBuf) -> Self {
        Self {
            settings: Mutex::new(persistence::load(&settings_path)),
            settings_path,
            click_through: Mutex::new(false),
            settings_open: Mutex::new(false),
            settle_generation: AtomicU64::new(0),
            aspect: Mutex::new(Aspect::Landscape),
            before_turn: Mutex::new(None),
            turned_to: Mutex::new(None),
            settled: Mutex::new(None),
            page_problems: Mutex::new(Vec::new()),
            opening: Mutex::new(None),
            update: Mutex::new((None, false)),
        }
    }

    pub fn settings(&self) -> Settings {
        self.settings.lock().unwrap().clone()
    }

    pub fn update(&self, app: &AppHandle, change: impl FnOnce(&mut Settings)) {
        let mut settings = self.settings.lock().unwrap();
        change(&mut settings);
        if let Err(error) = persistence::save(&self.settings_path, &settings) {
            logbook::write(app, &format!("could not save settings: {error}"));
        }
    }

    pub fn set_settings_open(&self, open: bool) {
        *self.settings_open.lock().unwrap() = open;
    }

    pub fn opening(&self) -> Option<String> {
        self.opening.lock().unwrap().as_ref().map(|s| s.id.clone())
    }

    /// Starts opening `service`; false while another one is still opening.
    pub fn start_opening(&self, service: OpenService) -> bool {
        let mut opening = self.opening.lock().unwrap();
        if opening.is_some() {
            return false;
        }
        *opening = Some(service);
        true
    }

    pub fn end_opening(&self) -> Option<OpenService> {
        self.opening.lock().unwrap().take()
    }

    /// Takes the page's current problems (sorted); returns whether they changed.
    pub fn set_page_problems(&self, problems: Vec<Problem>) -> bool {
        std::mem::replace(&mut *self.page_problems.lock().unwrap(), problems.clone()) != problems
    }

    /// Takes what the automatic check found; returns whether it changed.
    pub fn set_update(&self, found: Option<String>, ready: bool) -> bool {
        let next = (found, ready);
        std::mem::replace(&mut *self.update.lock().unwrap(), next.clone()) != next
    }

    pub(super) fn aspect(&self) -> Aspect {
        *self.aspect.lock().unwrap()
    }

    pub fn state(&self) -> OverlayState {
        let settings = self.settings.lock().unwrap();
        let update = self.update.lock().unwrap().clone();
        OverlayState {
            mode: settings.mode,
            opacity: settings.opacity,
            click_through: *self.click_through.lock().unwrap(),
            service_id: settings.last_service.as_ref().map(|s| s.id.clone()),
            settings_open: *self.settings_open.lock().unwrap(),
            hotkeys: settings.hotkeys.clone(),
            language: settings.language,
            theme: settings.theme,
            animations: settings.animations,
            shorts: settings.shorts.clone(),
            update_check: settings.update_check,
            graphics_acceleration: settings.graphics_acceleration,
            video_only: settings.video_only,
            zoom: settings.zoom,
            always_on_top: settings.always_on_top,
            fullscreen_in_window: settings.fullscreen_in_window,
            page_problems: self.page_problems.lock().unwrap().clone(),
            opening: self.opening(),
            keep_awake: settings.keep_awake,
            update_found: update.0,
            update_ready: update.1,
            portable: Build::current() == Build::Portable,
        }
    }
}
