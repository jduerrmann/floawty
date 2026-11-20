//! Window mode (a normal window) and floaty view (the overlay); each keeps its own geometry.
use serde::{Deserialize, Serialize};

use crate::geometry::{Aspect, Rect};
use crate::settings::{PortraitSize, Settings};

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Mode {
    #[default]
    Floaty,
    Window,
}

/// Only the floaty view stays on top: by its switch, or while click-through is on.
pub fn stays_on_top(mode: Mode, switch: bool, click_through: bool) -> bool {
    mode == Mode::Floaty && (switch || click_through)
}

/// What the show/hide hotkey does.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ShowHide {
    Show,
    Hide,
    /// A floaty view that others may cover comes to the front first.
    Raise,
}

pub fn show_hide_step(visible: bool, mode: Mode, on_top: bool, active: bool) -> ShowHide {
    match (visible, mode == Mode::Floaty && !on_top && !active) {
        (false, _) => ShowHide::Show,
        (true, true) => ShowHide::Raise,
        (true, false) => ShowHide::Hide,
    }
}

/// Saved geometry of a mode; `None` means "place it by default".
pub fn geometry_of(settings: &Settings, mode: Mode) -> Option<Rect> {
    match mode {
        Mode::Floaty => settings.floaty,
        Mode::Window => settings.window,
    }
}

/// Leaves the current mode: remembers where it was and switches to the other one.
pub fn switch(settings: &Settings, current: Rect) -> Settings {
    let mut switched = settings.clone();
    remember(&mut switched, current);
    switched.mode = match settings.mode {
        Mode::Floaty => Mode::Window,
        Mode::Window => Mode::Floaty,
    };
    switched
}

/// Stores the geometry of whichever mode is active.
pub fn remember(settings: &mut Settings, current: Rect) {
    match settings.mode {
        Mode::Floaty => settings.floaty = Some(current),
        Mode::Window => settings.window = Some(current),
    }
}

/// The size the floaty view takes when it turns to `target` from `current`, the other aspect.
pub fn floaty_size(settings: &Settings, target: Aspect, current: Rect) -> (u32, u32) {
    let swapped = match target {
        // Any landscape shape turns into a true 9:16 that keeps its long side.
        Aspect::Portrait => {
            let long = current.width.max(current.height);
            ((f64::from(long) * 9.0 / 16.0).round() as u32, long)
        }
        Aspect::Landscape => (current.height, current.width),
    };
    if settings.shorts.portrait_size == PortraitSize::Rotated {
        return swapped;
    }
    let saved = match target {
        Aspect::Landscape => settings.floaty,
        Aspect::Portrait => settings.floaty_portrait,
    };
    saved.map_or(swapped, |rect| (rect.width, rect.height))
}

/// While a Short turns the view, keeps the landscape place for a restart and, if asked, the portrait one.
pub fn remember_turned(settings: &mut Settings, portrait: Rect, landscape: Rect) {
    settings.floaty = Some(landscape);
    if settings.shorts.portrait_size == PortraitSize::Separate {
        settings.floaty_portrait = Some(portrait);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const FLOATY: Rect = Rect {
        x: 16,
        y: 16,
        width: 480,
        height: 270,
    };
    const WINDOW: Rect = Rect {
        x: 300,
        y: 200,
        width: 1280,
        height: 720,
    };

    #[test]
    fn starts_in_the_floaty_view() {
        assert_eq!(Settings::default().mode, Mode::Floaty);
    }

    #[test]
    fn switching_to_window_mode_remembers_the_overlay() {
        let switched = switch(&Settings::default(), FLOATY);
        assert_eq!(switched.mode, Mode::Window);
        assert_eq!(geometry_of(&switched, Mode::Floaty), Some(FLOATY));
        assert_eq!(geometry_of(&switched, Mode::Window), None);
    }

    #[test]
    fn switching_back_restores_the_overlay_and_remembers_the_window() {
        let in_window = switch(&Settings::default(), FLOATY);
        let back = switch(&in_window, WINDOW);
        assert_eq!(back.mode, Mode::Floaty);
        assert_eq!(geometry_of(&back, Mode::Floaty), Some(FLOATY));
        assert_eq!(geometry_of(&back, Mode::Window), Some(WINDOW));
    }

    const PORTRAIT: Rect = Rect {
        x: 1634,
        y: 544,
        width: 360,
        height: 640,
    };
    const LANDSCAPE: Rect = Rect {
        x: 1264,
        y: 664,
        width: 640,
        height: 360,
    };

    fn separate() -> Settings {
        let mut settings = Settings::default();
        settings.shorts.portrait_size = PortraitSize::Separate;
        settings
    }

    #[test]
    fn rotated_turns_a_landscape_floaty_into_portrait_by_swapping_the_sides() {
        assert_eq!(
            floaty_size(&Settings::default(), Aspect::Portrait, FLOATY),
            (270, 480)
        );
    }

    #[test]
    fn a_wider_than_16_9_floaty_turns_into_a_true_9_16_keeping_its_long_side() {
        let cinema = Rect {
            width: 640,
            height: 270,
            ..FLOATY
        };
        assert_eq!(
            floaty_size(&Settings::default(), Aspect::Portrait, cinema),
            (360, 640)
        );
    }

    #[test]
    fn rotated_turns_an_enlarged_portrait_back_into_the_swapped_landscape() {
        assert_eq!(
            floaty_size(&Settings::default(), Aspect::Landscape, PORTRAIT),
            (640, 360)
        );
    }

    #[test]
    fn separate_uses_the_saved_portrait_size() {
        let settings = Settings {
            floaty_portrait: Some(PORTRAIT),
            ..separate()
        };
        assert_eq!(floaty_size(&settings, Aspect::Portrait, FLOATY), (360, 640));
    }

    #[test]
    fn separate_uses_the_saved_landscape_size() {
        let settings = Settings {
            floaty: Some(LANDSCAPE),
            ..separate()
        };
        assert_eq!(
            floaty_size(&settings, Aspect::Landscape, PORTRAIT),
            (640, 360)
        );
    }

    #[test]
    fn separate_swaps_the_sides_while_no_portrait_size_is_saved() {
        assert_eq!(
            floaty_size(&separate(), Aspect::Portrait, FLOATY),
            (270, 480)
        );
    }

    #[test]
    fn separate_swaps_the_sides_while_no_landscape_size_is_saved() {
        assert_eq!(
            floaty_size(&separate(), Aspect::Landscape, PORTRAIT),
            (640, 360)
        );
    }

    #[test]
    fn rotated_remembers_only_the_landscape_rect() {
        let mut settings = Settings::default();
        remember_turned(&mut settings, PORTRAIT, LANDSCAPE);
        assert_eq!(settings.floaty, Some(LANDSCAPE));
        assert_eq!(settings.floaty_portrait, None);
    }

    #[test]
    fn separate_remembers_both_rects() {
        let mut settings = separate();
        remember_turned(&mut settings, PORTRAIT, LANDSCAPE);
        assert_eq!(settings.floaty, Some(LANDSCAPE));
        assert_eq!(settings.floaty_portrait, Some(PORTRAIT));
    }

    #[test]
    fn only_the_floaty_view_stays_on_top_by_its_switch_or_click_through() {
        assert!(stays_on_top(Mode::Floaty, true, false));
        assert!(!stays_on_top(Mode::Floaty, false, false));
        assert!(stays_on_top(Mode::Floaty, false, true));
        assert!(!stays_on_top(Mode::Window, true, false));
        assert!(!stays_on_top(Mode::Window, true, true));
    }

    #[test]
    fn the_show_hide_hotkey_hides_when_on_top_active_or_in_window_mode() {
        assert_eq!(
            show_hide_step(true, Mode::Floaty, true, false),
            ShowHide::Hide
        );
        assert_eq!(
            show_hide_step(true, Mode::Floaty, false, true),
            ShowHide::Hide
        );
        assert_eq!(
            show_hide_step(true, Mode::Window, false, false),
            ShowHide::Hide
        );
    }

    #[test]
    fn the_show_hide_hotkey_brings_a_floaty_view_not_on_top_and_not_active_to_the_front() {
        assert_eq!(
            show_hide_step(true, Mode::Floaty, false, false),
            ShowHide::Raise
        );
    }

    #[test]
    fn the_show_hide_hotkey_shows_a_hidden_window() {
        assert_eq!(
            show_hide_step(false, Mode::Floaty, false, false),
            ShowHide::Show
        );
        assert_eq!(
            show_hide_step(false, Mode::Window, false, true),
            ShowHide::Show
        );
    }

    #[test]
    fn remembering_only_touches_the_active_mode() {
        let mut settings = switch(&Settings::default(), FLOATY);
        remember(&mut settings, WINDOW);
        assert_eq!(geometry_of(&settings, Mode::Window), Some(WINDOW));
        assert_eq!(geometry_of(&settings, Mode::Floaty), Some(FLOATY));
    }
}
