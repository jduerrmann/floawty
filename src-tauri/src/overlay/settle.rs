//! Settling: once the user lets go of a move or resize, fit the shape, snap and save.
use std::sync::atomic::Ordering;
use std::thread;
use std::time::Duration;

use tauri::AppHandle;

use super::{current_area, landscape_of, main_window, overlay, set_rect, visible_rect};
use crate::geometry::{self, Aspect, Rect};
use crate::logbook;
use crate::mode::{self, Mode};

/// Waiting this long after the last move or resize counts as "the user let go".
const SETTLE_TIME: Duration = Duration::from_millis(250);

/// Saves the geometry once the user stops moving or resizing; the floaty view also
/// snaps and fits its shape: free with magnets at 16:9 and 12:5, or 9:16 while a Short plays.
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
            // Mid-drag, Windows would put its own size back on the next mouse move.
            if mouse_button_down() {
                settle_later(&handle);
                return;
            }
            if let Err(error) = settle(&handle) {
                logbook::write(&handle, &format!("could not settle the window: {error}"));
            }
        });
    });
}

// Either button: with swapped buttons Windows drags with the physical right one.
fn mouse_button_down() -> bool {
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
        GetAsyncKeyState, VK_LBUTTON, VK_RBUTTON,
    };
    let down = |key: u16| {
        // SAFETY: reads the global key state; no handle or pointer is involved.
        unsafe { GetAsyncKeyState(i32::from(key)) as u16 & 0x8000 != 0 }
    };
    down(VK_LBUTTON) || down(VK_RBUTTON)
}

fn settle(app: &AppHandle) -> tauri::Result<()> {
    let window = main_window(app);
    // A page's fullscreen on the whole screen is not a geometry to keep or snap.
    if window.is_fullscreen()? {
        return Ok(());
    }
    let current = visible_rect(&window)?;
    if overlay(app).settings().mode == Mode::Window {
        overlay(app).update(app, |s| mode::remember(s, current));
        return Ok(());
    }
    let Some((area, scale)) = current_area(&window)? else {
        return Ok(());
    };
    let aspect = overlay(app).aspect();
    let before = overlay(app).settled.lock().unwrap().take();
    let now = (current.width, current.height);
    // Free in landscape with magnets at 16:9 and 12:5; a Short keeps the overlay 9:16.
    let (width, height) = match aspect {
        Aspect::Landscape => geometry::fit_landscape(before, now, scale),
        Aspect::Portrait => geometry::fit_resized(before, now, aspect),
    };
    let fitted = Rect {
        width,
        height,
        ..current
    };
    // A resize that grew past the screen edge comes back onto it; a plain move may hang over.
    let resized =
        (width, height) != (current.width, current.height) || before != Some((width, height));
    let fitted = if resized {
        geometry::shift_inside(fitted, area)
    } else {
        fitted
    };
    let snapped = geometry::snap(fitted, area, scale);
    if snapped != current {
        set_rect(&window, snapped)?;
    }
    *overlay(app).settled.lock().unwrap() = Some((snapped.width, snapped.height));
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
    let same_size =
        turned_to.is_some_and(|r| r.width == current.width && r.height == current.height);
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
