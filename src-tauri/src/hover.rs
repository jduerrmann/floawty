//! When the bar shows over a service: after the cursor rests on floawty, until it leaves or idles.

/// Hovering this long shows the bar, so passing over floawty does not flash it.
const SHOW_DELAY_MS: u64 = 300;
/// A cursor that rests this long hides the bar again, except over the bar itself.
const IDLE_HIDE_MS: u64 = 3000;

/// One look at the cursor.
#[derive(Clone, Copy, Debug)]
pub struct Sample {
    pub inside: bool,
    pub over_bar: bool,
    pub cursor: (i32, i32),
    pub now_ms: u64,
}

#[derive(Debug, Default)]
pub struct Hover {
    entered_ms: Option<u64>,
    last_move_ms: u64,
    last_cursor: Option<(i32, i32)>,
}

impl Hover {
    /// Whether the bar should be visible after this sample.
    pub fn visible(&mut self, sample: Sample) -> bool {
        if !sample.inside {
            *self = Self::default();
            return false;
        }
        let entered_ms = *self.entered_ms.get_or_insert(sample.now_ms);
        if self.last_cursor != Some(sample.cursor) {
            self.last_cursor = Some(sample.cursor);
            self.last_move_ms = sample.now_ms;
        }
        let rested = sample.now_ms - entered_ms >= SHOW_DELAY_MS;
        let moving = sample.now_ms - self.last_move_ms < IDLE_HIDE_MS;
        rested && (moving || sample.over_bar)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn at(now_ms: u64, cursor: (i32, i32)) -> Sample {
        Sample {
            inside: true,
            over_bar: false,
            cursor,
            now_ms,
        }
    }

    fn outside(now_ms: u64) -> Sample {
        Sample {
            inside: false,
            ..at(now_ms, (0, 0))
        }
    }

    #[test]
    fn the_bar_shows_after_300_ms_over_floawty() {
        let mut hover = Hover::default();
        assert!(!hover.visible(at(1000, (10, 10))));
        assert!(!hover.visible(at(1200, (12, 10))));
        assert!(hover.visible(at(1300, (14, 10))));
    }

    #[test]
    fn leaving_hides_the_bar_and_restarts_the_delay() {
        let mut hover = Hover::default();
        hover.visible(at(0, (10, 10)));
        assert!(hover.visible(at(400, (11, 10))));
        assert!(!hover.visible(outside(500)));
        assert!(!hover.visible(at(600, (10, 10))));
        assert!(hover.visible(at(900, (10, 11))));
    }

    #[test]
    fn a_resting_cursor_hides_the_bar_until_it_moves() {
        let mut hover = Hover::default();
        hover.visible(at(0, (10, 10)));
        assert!(hover.visible(at(400, (20, 20))));
        assert!(hover.visible(at(3300, (20, 20))));
        assert!(!hover.visible(at(3400, (20, 20))));
        assert!(hover.visible(at(3500, (21, 20))));
    }

    #[test]
    fn the_bar_stays_while_the_cursor_rests_on_it() {
        let mut hover = Hover::default();
        let on_bar = |now_ms| Sample {
            over_bar: true,
            ..at(now_ms, (20, 5))
        };
        hover.visible(on_bar(0));
        assert!(hover.visible(on_bar(400)));
        assert!(hover.visible(on_bar(10_000)));
    }
}
