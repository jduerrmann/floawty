//! The main window in floaty view or window mode: placement, snapping, opacity,
//! click-through, visibility.
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, Window};

use crate::bar;
use crate::geometry::{self, Aspect, Rect};
use crate::logbook;
use crate::mode::{self, Mode};
use crate::page::{self, Problem};
use crate::persistence;
use crate::service;
use crate::settings::{self, Hotkeys, Language, Settings, Shorts};

/// Waiting this long after the last move or resize counts as "the user let go".
const SETTLE_TIME: Duration = Duration::from_millis(250);

pub struct Overlay {
    settings: Mutex<Settings>,
    settings_path: PathBuf,
    click_through: Mutex<bool>,
    settings_open: Mutex<bool>,
    settle_generation: AtomicU64,
    /// What the service page shows now; the floaty view turns with it.
    aspect: Mutex<Aspect>,
    /// The landscape view before it turned upright, restored unless the user changed the upright one.
    before_turn: Mutex<Option<Rect>>,
    turned_to: Mutex<Option<Rect>>,
    page_problems: Mutex<Vec<Problem>>,
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
    pub shorts: Shorts,
    pub update_check: bool,
    pub video_only: bool,
    pub page_problems: Vec<Problem>,
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
            page_problems: Mutex::new(Vec::new()),
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

    /// Takes the page's current problems (sorted); returns whether they changed.
    pub fn set_page_problems(&self, problems: Vec<Problem>) -> bool {
        std::mem::replace(&mut *self.page_problems.lock().unwrap(), problems.clone()) != problems
    }

    fn aspect(&self) -> Aspect {
        *self.aspect.lock().unwrap()
    }

    pub fn state(&self) -> OverlayState {
        let settings = self.settings.lock().unwrap();
        OverlayState {
            mode: settings.mode,
            opacity: settings.opacity,
            click_through: *self.click_through.lock().unwrap(),
            service_id: settings.last_service.as_ref().map(|s| s.id.clone()),
            settings_open: *self.settings_open.lock().unwrap(),
            hotkeys: settings.hotkeys.clone(),
            language: settings.language,
            shorts: settings.shorts.clone(),
            update_check: settings.update_check,
            video_only: settings.video_only,
            page_problems: self.page_problems.lock().unwrap().clone(),
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
    let before = overlay(app).settings();
    let turned = before.mode == Mode::Floaty && overlay(app).aspect() == Aspect::Portrait;
    let before_turn = overlay(app).before_turn.lock().unwrap().take();
    let floaty = match (turned, before_turn) {
        (true, Some(landscape)) => landscape,
        (true, None) => landscape_of(&before, current, current_area(&window)?),
        (false, _) => current,
    };
    overlay(app).update(app, |s| {
        if turned {
            mode::remember_turned(s, current, floaty);
        }
        *s = mode::switch(s, floaty);
    });
    let settings = overlay(app).settings();
    let click_through_on = *overlay(app).click_through.lock().unwrap();
    if settings.mode == Mode::Window && click_through_on {
        toggle_click_through_now(app, &window)?;
    }
    apply_mode_style(&window, settings.mode)?;
    set_rect(&window, target_rect(&window, &settings)?)?;
    if settings.mode == Mode::Floaty && overlay(app).aspect() == Aspect::Portrait {
        turn(app, &window, &settings, Aspect::Portrait)?;
    }
    apply_opacity(&window, effective_opacity(&settings))?;
    emit_state(app);
    // The page shows video only in the floaty view alone, so it learns the new mode.
    page::sync(app);
    Ok(())
}

/// Video only on or off for all services; the page applies it when it is next asked.
pub fn toggle_video_only(app: &AppHandle) {
    overlay(app).update(app, |s| s.video_only = !s.video_only);
    emit_state(app);
    page::sync(app);
}

fn current_area(window: &Window) -> tauri::Result<Option<(Rect, f64)>> {
    Ok(window.current_monitor()?.map(|monitor| {
        let area = to_rect(monitor.work_area().position, monitor.work_area().size);
        (area, monitor.scale_factor())
    }))
}

/// Where the landscape floaty view would be, seen from the portrait one.
fn landscape_of(settings: &Settings, portrait: Rect, area: Option<(Rect, f64)>) -> Rect {
    let Some((area, scale)) = area else {
        return portrait;
    };
    let size = mode::floaty_size(settings, Aspect::Landscape, portrait);
    geometry::turn(portrait, size, area, scale)
}

/// The service page shows a Short or not; only the floaty view turns, window mode stays.
pub fn set_aspect(app: &AppHandle, aspect: Aspect) {
    let handle = app.clone();
    // Turning, settling and mode changes share the main thread, so they never interleave.
    let _ = app.run_on_main_thread(move || {
        if let Err(error) = change_aspect(&handle, aspect) {
            logbook::write(&handle, &format!("could not turn the overlay: {error}"));
        }
    });
}

fn change_aspect(app: &AppHandle, aspect: Aspect) -> tauri::Result<()> {
    let previous = std::mem::replace(&mut *overlay(app).aspect.lock().unwrap(), aspect);
    let settings = overlay(app).settings();
    if previous == aspect || settings.mode == Mode::Window {
        return Ok(());
    }
    turn(app, &main_window(app), &settings, aspect)
}

// Settling afterwards snaps the turned view and saves it.
fn turn(
    app: &AppHandle,
    window: &Window,
    settings: &Settings,
    aspect: Aspect,
) -> tauri::Result<()> {
    let current = visible_rect(window)?;
    let Some((area, scale)) = current_area(window)? else {
        return Ok(());
    };
    let before = overlay(app).before_turn.lock().unwrap().take();
    let target = match (aspect, before) {
        (Aspect::Landscape, Some(landscape)) => landscape,
        _ => geometry::turn(
            current,
            mode::floaty_size(settings, aspect, current),
            area,
            scale,
        ),
    };
    let upright = aspect == Aspect::Portrait;
    *overlay(app).before_turn.lock().unwrap() = upright.then_some(current);
    *overlay(app).turned_to.lock().unwrap() = upright.then_some(target);
    set_rect(window, target)
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

/// Tells both of floawty's pages about a change and lets the bar follow it.
pub fn emit_state(app: &AppHandle) {
    bar::refresh(app);
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
        window.hide()?;
    } else {
        window.show()?;
        apply_opacity(&window, effective_opacity(&overlay(app).settings()))?;
    }
    emit_state(app);
    page::sync(app);
    Ok(())
}

/// Saves the geometry once the user stops moving or resizing; the floaty view also
/// snaps and keeps 16:9, or 9:16 while a Short plays.
pub fn settle_later(app: &AppHandle) {
    let generation = overlay(app)
        .settle_generation
        .fetch_add(1, Ordering::SeqCst)
        + 1;
    let app = app.clone();
    thread::spawn(move || {
        thread::sleep(SETTLE_TIME);
        let handle = app.clone();
        let _ = app.run_on_main_thread(move || {
            if overlay(&handle).settle_generation.load(Ordering::SeqCst) != generation {
                return;
            }
            if let Err(error) = settle(&handle) {
                logbook::write(&handle, &format!("could not settle the window: {error}"));
            }
        });
    });
}

fn settle(app: &AppHandle) -> tauri::Result<()> {
    let window = main_window(app);
    let current = visible_rect(&window)?;
    if overlay(app).settings().mode == Mode::Window {
        overlay(app).update(app, |s| mode::remember(s, current));
        return Ok(());
    }
    let Some((area, scale)) = current_area(&window)? else {
        return Ok(());
    };
    let aspect = overlay(app).aspect();
    let (width, height) = geometry::fit_aspect(current.width, aspect);
    let snapped = geometry::snap(
        Rect {
            width,
            height,
            ..current
        },
        area,
        scale,
    );
    if snapped != current {
        set_rect(&window, snapped)?;
    }
    if aspect == Aspect::Landscape {
        overlay(app).update(app, |s| mode::remember(s, snapped));
        return Ok(());
    }
    let landscape = match landscape_before_turn(app, current, snapped, (area, scale)) {
        Some(landscape) => landscape,
        None => landscape_of(&overlay(app).settings(), snapped, Some((area, scale))),
    };
    overlay(app).update(app, |s| mode::remember_turned(s, snapped, landscape));
    Ok(())
}

/// The pre-turn landscape view: kept while the upright one keeps floawty's size (a move
/// only shifts it), forgotten once the user resizes.
fn landscape_before_turn(
    app: &AppHandle,
    current: Rect,
    snapped: Rect,
    (area, scale): (Rect, f64),
) -> Option<Rect> {
    let state = overlay(app);
    let mut turned_to = state.turned_to.lock().unwrap();
    let mut before = state.before_turn.lock().unwrap();
    // Settling derives the height from the width, so only the width tells a resize.
    let same_size = turned_to.is_some_and(|r| r.width == current.width);
    if !same_size {
        *turned_to = None;
        *before = None;
        return None;
    }
    if *turned_to != Some(current) {
        *before = before.map(|b| geometry::turn(snapped, (b.width, b.height), area, scale));
    }
    *turned_to = Some(snapped);
    *before
}
