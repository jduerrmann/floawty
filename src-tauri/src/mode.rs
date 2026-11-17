//! Window mode (a normal window) and floaty view (the overlay); each keeps its own geometry.
use serde::{Deserialize, Serialize};

use crate::geometry::Rect;
use crate::settings::Settings;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Mode {
    #[default]
    Floaty,
    Window,
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

    #[test]
    fn remembering_only_touches_the_active_mode() {
        let mut settings = switch(&Settings::default(), FLOATY);
        remember(&mut settings, WINDOW);
        assert_eq!(geometry_of(&settings, Mode::Window), Some(WINDOW));
        assert_eq!(geometry_of(&settings, Mode::Floaty), Some(FLOATY));
    }
}
