//! The main window in floaty view or window mode: placement, snapping, opacity,
//! click-through, visibility.
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, Window};

use crate::geometry::{self, Aspect, Rect};
use crate::logbook;
use crate::mode::{self, Mode};
use crate::persistence;
use crate::service;
use crate::settings::{self, Settings};

/// Waiting this long after the last move or resize counts as "the user let go".
const SETTLE_TIME: Duration = Duration::from_millis(250);

pub struct Overlay {
    settings: Mutex<Settings>,
    settings_path: PathBuf,
    click_through: Mutex<bool>,
    settle_generation: AtomicU64,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayState {
    pub mode: Mode,
    pub opacity: f64,
    pub click_through: bool,
    pub click_through_hotkey: String,
}

impl Overlay {
    pub fn load(settings_path: PathBuf) -> Self {
        Self {
            settings: Mutex::new(persistence::load(&settings_path)),
            settings_path,
            click_through: Mutex::new(false),
            settle_generation: AtomicU64::new(0),
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

    pub fn state(&self) -> OverlayState {
        let settings = self.settings.lock().unwrap();
        OverlayState {
            mode: settings.mode,
            opacity: settings.opacity,
            click_through: *self.click_through.lock().unwrap(),
            click_through_hotkey: settings.hotkeys.click_through.clone(),
        }
    }
}

fn overlay(app: &AppHandle) -> tauri::State<'_, Overlay> {
    app.state::<Overlay>()
}

// A plain Window: with the service webview inside, it is no longer a WebviewWindow.
pub fn main_window(app: &AppHandle) -> Window {
    app.get_window("main")
        .expect("the main window is defined in tauri.conf.json")
}

fn to_rect(position: PhysicalPosition<i32>, size: PhysicalSize<u32>) -> Rect {
    Rect {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
    }
}

fn work_areas(window: &Window) -> tauri::Result<Vec<Rect>> {
    let monitors = window.available_monitors()?;
    Ok(monitors
        .iter()
        .map(|m| to_rect(m.work_area().position, m.work_area().size))
        .collect())
}

// Geometry means the visible client area; Windows adds invisible resize borders around it.
fn visible_rect(window: &Window) -> tauri::Result<Rect> {
    Ok(to_rect(window.inner_position()?, window.inner_size()?))
}

fn set_rect(window: &Window, rect: Rect) -> tauri::Result<()> {
    window.set_size(PhysicalSize::new(rect.width, rect.height))?;
    let inner = window.inner_position()?;
    let outer = window.outer_position()?;
    let x = rect.x - (inner.x - outer.x);
    let y = rect.y - (inner.y - outer.y);
    window.set_position(PhysicalPosition::new(x, y))
}

fn default_rect(window: &Window, mode: Mode) -> tauri::Result<Rect> {
    let monitor = window
        .primary_monitor()?
        .expect("Windows always has a primary monitor");
    let area = to_rect(monitor.work_area().position, monitor.work_area().size);
    Ok(match mode {
        Mode::Floaty => geometry::default_placement(area, monitor.scale_factor()),
        Mode::Window => geometry::default_window_placement(area, monitor.scale_factor()),
    })
}

/// Where the active mode was last time, or its default place.
fn target_rect(window: &Window, settings: &Settings) -> tauri::Result<Rect> {
    let saved = mode::geometry_of(settings, settings.mode);
    let restored = saved.and_then(|rect| geometry::restore(rect, &work_areas(window).ok()?));
    match restored {
        Some(rect) => Ok(rect),
        None => default_rect(window, settings.mode),
    }
}

/// Window mode is a normal window; the floaty view is frameless and stays on top.
fn apply_mode_style(window: &Window, mode: Mode) -> tauri::Result<()> {
    window.set_decorations(mode == Mode::Window)?;
    window.set_always_on_top(mode == Mode::Floaty)
}

fn effective_opacity(settings: &Settings) -> f64 {
    match settings.mode {
        Mode::Floaty => settings.opacity,
        Mode::Window => 1.0,
    }
}

/// Opens floawty in the mode and place it was closed in.
pub fn place_and_show(app: &AppHandle) -> tauri::Result<()> {
    let window = main_window(app);
    let settings = overlay(app).settings();
    apply_mode_style(&window, settings.mode)?;
    set_rect(&window, target_rect(&window, &settings)?)?;
    window.show()?;
    // Showing the window resets its layered style, so opacity comes after.
    apply_opacity(&window, effective_opacity(&settings))
}

/// Switches between floaty view and window mode; each keeps its own geometry.
pub fn toggle_mode(app: &AppHandle) -> tauri::Result<()> {
    let window = main_window(app);
    let current = visible_rect(&window)?;
    overlay(app).update(app, |s| *s = mode::switch(s, current));
    let settings = overlay(app).settings();
    let click_through_on = *overlay(app).click_through.lock().unwrap();
    if settings.mode == Mode::Window && click_through_on {
        toggle_click_through_now(app, &window)?;
    }
    apply_mode_style(&window, settings.mode)?;
    set_rect(&window, target_rect(&window, &settings)?)?;
    apply_opacity(&window, effective_opacity(&settings))?;
    emit_state(app);
    Ok(())
}

// Tauri has no opacity API, so the window becomes a layered Win32 window.
fn apply_opacity(window: &Window, opacity: f64) -> tauri::Result<()> {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetWindowLongPtrW, SetLayeredWindowAttributes, SetWindowLongPtrW, GWL_EXSTYLE, LWA_ALPHA,
        WS_EX_LAYERED,
    };
    let hwnd = window.hwnd()?.0 as windows_sys::Win32::Foundation::HWND;
    let alpha = (opacity * 255.0).round() as u8;
    // SAFETY: hwnd belongs to our own live window; both calls only change its style and alpha.
    unsafe {
        let style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
        SetWindowLongPtrW(hwnd, GWL_EXSTYLE, style | WS_EX_LAYERED as isize);
        SetLayeredWindowAttributes(hwnd, 0, alpha, LWA_ALPHA);
    }
    Ok(())
}

fn emit_state(app: &AppHandle) {
    let _ = app.emit("overlay-state", overlay(app).state());
}

pub fn set_opacity(app: &AppHandle, value: f64) -> tauri::Result<()> {
    let opacity = settings::clamp_opacity(value);
    overlay(app).update(app, |s| s.opacity = opacity);
    apply_opacity(
        &main_window(app),
        effective_opacity(&overlay(app).settings()),
    )?;
    emit_state(app);
    Ok(())
}

pub fn step_opacity(app: &AppHandle, steps: i32) -> tauri::Result<()> {
    let current = overlay(app).settings().opacity;
    set_opacity(app, settings::step_opacity(current, steps))
}

/// Click-through only exists in the floaty view; window mode is a normal window.
pub fn toggle_click_through(app: &AppHandle) -> tauri::Result<()> {
    if overlay(app).settings().mode == Mode::Window {
        return Ok(());
    }
    toggle_click_through_now(app, &main_window(app))
}

fn toggle_click_through_now(app: &AppHandle, window: &Window) -> tauri::Result<()> {
    let enabled = {
        let state = overlay(app);
        let mut click_through = state.click_through.lock().unwrap();
        *click_through = !*click_through;
        *click_through
    };
    window.set_ignore_cursor_events(enabled)?;
    // Changing the cursor handling can reset the layered attributes.
    apply_opacity(window, effective_opacity(&overlay(app).settings()))?;
    emit_state(app);
    Ok(())
}

pub fn toggle_visible(app: &AppHandle) -> tauri::Result<()> {
    let window = main_window(app);
    if window.is_visible()? {
        service::pause(app);
        return window.hide();
    }
    window.show()?;
    apply_opacity(&window, effective_opacity(&overlay(app).settings()))
}

/// Saves the geometry once the user stops moving or resizing; the floaty view also
/// snaps and keeps 16:9.
pub fn settle_later(app: &AppHandle) {
    let generation = overlay(app)
        .settle_generation
        .fetch_add(1, Ordering::SeqCst)
        + 1;
    let app = app.clone();
    thread::spawn(move || {
        thread::sleep(SETTLE_TIME);
        if overlay(&app).settle_generation.load(Ordering::SeqCst) != generation {
            return;
        }
        if let Err(error) = settle(&app) {
            logbook::write(&app, &format!("could not settle the window: {error}"));
        }
    });
}

fn settle(app: &AppHandle) -> tauri::Result<()> {
    let window = main_window(app);
    let current = visible_rect(&window)?;
    if overlay(app).settings().mode == Mode::Window {
        overlay(app).update(app, |s| mode::remember(s, current));
        return Ok(());
    }
    let Some(monitor) = window.current_monitor()? else {
        return Ok(());
    };
    let area = to_rect(monitor.work_area().position, monitor.work_area().size);
    let (width, height) = geometry::fit_aspect(current.width, Aspect::Landscape);
    let snapped = geometry::snap(
        Rect {
            width,
            height,
            ..current
        },
        area,
        monitor.scale_factor(),
    );
    if snapped != current {
        set_rect(&window, snapped)?;
    }
    overlay(app).update(app, |s| mode::remember(s, snapped));
    Ok(())
}
