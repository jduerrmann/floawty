//! Pure window geometry in physical pixels: placement, snapping, aspect ratio, restore.
use serde::{Deserialize, Serialize};

const OVERLAY_WIDTH: f64 = 480.0;
const OVERLAY_HEIGHT: f64 = 270.0;
const WINDOW_WIDTH: f64 = 1280.0;
const WINDOW_HEIGHT: f64 = 720.0;
/// Gap between a snapped window and the edge of the work area, in logical pixels.
const SNAP_GAP: f64 = 16.0;
/// How close an edge must come before it snaps, in logical pixels.
const SNAP_REACH: f64 = 32.0;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Aspect {
    Landscape,
    #[cfg_attr(
        not(test),
        expect(dead_code, reason = "Shorts report their format with mvp-06")
    )]
    Portrait,
}

impl Rect {
    fn right(self) -> i32 {
        self.x + self.width as i32
    }

    fn bottom(self) -> i32 {
        self.y + self.height as i32
    }

    fn overlap_area(self, other: Rect) -> i64 {
        let width = self.right().min(other.right()) - self.x.max(other.x);
        let height = self.bottom().min(other.bottom()) - self.y.max(other.y);
        if width <= 0 || height <= 0 {
            return 0;
        }
        i64::from(width) * i64::from(height)
    }
}

fn to_pixels(logical: f64, scale: f64) -> i32 {
    (logical * scale).round() as i32
}

pub fn default_placement(work_area: Rect, scale: f64) -> Rect {
    let width = to_pixels(OVERLAY_WIDTH, scale);
    let height = to_pixels(OVERLAY_HEIGHT, scale);
    let gap = to_pixels(SNAP_GAP, scale);
    Rect {
        x: work_area.right() - width - gap,
        y: work_area.bottom() - height - gap,
        width: width as u32,
        height: height as u32,
    }
}

/// First window-mode geometry: 1280 x 720, smaller on small screens, centred.
pub fn default_window_placement(work_area: Rect, scale: f64) -> Rect {
    let gap = to_pixels(SNAP_GAP, scale);
    let wanted_width = f64::from(to_pixels(WINDOW_WIDTH, scale));
    let wanted_height = f64::from(to_pixels(WINDOW_HEIGHT, scale));
    let room_width = f64::from(work_area.width as i32 - 2 * gap);
    let room_height = f64::from(work_area.height as i32 - 2 * gap);
    let shrink = (room_width / wanted_width)
        .min(room_height / wanted_height)
        .min(1.0);
    let (width, height) = fit_aspect((wanted_width * shrink).floor() as u32, Aspect::Landscape);
    Rect {
        x: work_area.x + (work_area.width - width) as i32 / 2,
        y: work_area.y + (work_area.height - height) as i32 / 2,
        width,
        height,
    }
}

/// Snaps each axis on its own, so a window near a corner lands exactly in it.
pub fn snap(window: Rect, work_area: Rect, scale: f64) -> Rect {
    let gap = to_pixels(SNAP_GAP, scale);
    let reach = to_pixels(SNAP_REACH, scale);
    let snap_axis = |start: i32, end: i32, area_start: i32, area_end: i32| {
        let length = end - start;
        if (start - area_start).abs() <= reach {
            area_start + gap
        } else if (area_end - end).abs() <= reach {
            area_end - gap - length
        } else {
            start
        }
    };
    Rect {
        x: snap_axis(window.x, window.right(), work_area.x, work_area.right()),
        y: snap_axis(window.y, window.bottom(), work_area.y, work_area.bottom()),
        ..window
    }
}

/// Height that keeps the aspect ratio for a given width.
pub fn fit_aspect(width: u32, aspect: Aspect) -> (u32, u32) {
    let (wide, high) = match aspect {
        Aspect::Landscape => (16, 9),
        Aspect::Portrait => (9, 16),
    };
    let height = (f64::from(width) * f64::from(high) / f64::from(wide)).round() as u32;
    (width, height)
}

/// Where to put a saved window now; `None` when its monitor is gone.
pub fn restore(saved: Rect, work_areas: &[Rect]) -> Option<Rect> {
    let area = work_areas
        .iter()
        .copied()
        .filter(|area| area.overlap_area(saved) > 0)
        .max_by_key(|area| area.overlap_area(saved))?;
    let width = saved.width.min(area.width);
    let height = saved.height.min(area.height);
    Some(Rect {
        x: saved.x.clamp(area.x, area.right() - width as i32),
        y: saved.y.clamp(area.y, area.bottom() - height as i32),
        width,
        height,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const FULL_HD: Rect = Rect {
        x: 0,
        y: 0,
        width: 1920,
        height: 1040,
    };
    const LEFT_MONITOR: Rect = Rect {
        x: -1280,
        y: 0,
        width: 1280,
        height: 984,
    };

    fn rect(x: i32, y: i32, width: u32, height: u32) -> Rect {
        Rect {
            x,
            y,
            width,
            height,
        }
    }

    #[test]
    fn first_placement_is_bottom_right_with_a_gap() {
        assert_eq!(default_placement(FULL_HD, 1.0), rect(1424, 754, 480, 270));
    }

    #[test]
    fn first_placement_scales_with_the_display() {
        let area = rect(0, 0, 2880, 1560);
        assert_eq!(default_placement(area, 1.5), rect(2136, 1131, 720, 405));
    }

    #[test]
    fn snaps_to_the_bottom_right_corner_when_close() {
        let near_corner = rect(1430, 760, 480, 270);
        assert_eq!(snap(near_corner, FULL_HD, 1.0), rect(1424, 754, 480, 270));
    }

    #[test]
    fn snaps_only_the_axis_that_is_close() {
        let near_left_edge = rect(20, 400, 480, 270);
        assert_eq!(snap(near_left_edge, FULL_HD, 1.0), rect(16, 400, 480, 270));
    }

    #[test]
    fn leaves_the_window_alone_when_far_from_edges() {
        let middle = rect(700, 400, 480, 270);
        assert_eq!(snap(middle, FULL_HD, 1.0), middle);
    }

    #[test]
    fn snaps_on_a_monitor_left_of_the_primary() {
        let near_top_left = rect(-1270, 5, 480, 270);
        assert_eq!(
            snap(near_top_left, LEFT_MONITOR, 1.0),
            rect(-1264, 16, 480, 270)
        );
    }

    #[test]
    fn window_mode_starts_centred_at_1280_by_720() {
        assert_eq!(
            default_window_placement(FULL_HD, 1.0),
            rect(320, 160, 1280, 720)
        );
    }

    #[test]
    fn window_mode_shrinks_to_fit_a_small_screen() {
        let laptop = rect(0, 0, 1366, 728);
        assert_eq!(
            default_window_placement(laptop, 1.0),
            rect(64, 16, 1237, 696)
        );
    }

    #[test]
    fn keeps_16_to_9() {
        assert_eq!(fit_aspect(640, Aspect::Landscape), (640, 360));
    }

    #[test]
    fn keeps_9_to_16_for_shorts() {
        assert_eq!(fit_aspect(270, Aspect::Portrait), (270, 480));
    }

    #[test]
    fn restores_a_window_on_an_existing_monitor() {
        let saved = rect(-900, 300, 480, 270);
        assert_eq!(restore(saved, &[FULL_HD, LEFT_MONITOR]), Some(saved));
    }

    #[test]
    fn gives_up_when_the_monitor_is_gone() {
        let saved = rect(-900, 300, 480, 270);
        assert_eq!(restore(saved, &[FULL_HD]), None);
    }

    #[test]
    fn pulls_a_window_back_that_hangs_over_the_edge() {
        let saved = rect(1700, 900, 480, 270);
        assert_eq!(restore(saved, &[FULL_HD]), Some(rect(1440, 770, 480, 270)));
    }
}
