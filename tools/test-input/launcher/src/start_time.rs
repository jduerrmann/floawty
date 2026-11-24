//! `floawty --report-start`: how long floawty takes from its process start to a visible window,
//! without the time it is held for the shim.
use std::time::{Duration, Instant};

use test_input_shared::protocol;

const POLL: Duration = Duration::from_millis(5);
pub const LIMIT: Duration = Duration::from_secs(30);

/// Milliseconds from `from` until `visible` first says yes; an error when it fails or `limit` passes.
pub fn wait_until_visible(
    from: Instant,
    limit: Duration,
    visible: &dyn Fn() -> Result<bool, String>,
) -> Result<u64, String> {
    loop {
        if visible()? {
            return Ok(from.elapsed().as_millis() as u64);
        }
        if from.elapsed() >= limit {
            return Err(format!("floawty showed no window within {limit:?}"));
        }
        std::thread::sleep(POLL);
    }
}

/// Where the start clock stands: the process start, moved on by the time floawty was held for the
/// shim, which a start from Explorer does not have.
pub fn counted_from(created: Instant, suspended: Instant, resumed: Instant) -> Instant {
    created + resumed.saturating_duration_since(suspended)
}

/// The second line of the protocol when start reporting is on.
pub fn started_line(result: Result<u64, String>) -> String {
    match result {
        Ok(milliseconds) => format!("started {milliseconds}"),
        Err(cause) => protocol::error(&cause),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::Cell;

    #[test]
    fn the_time_floawty_was_held_for_the_shim_does_not_count() {
        let created = Instant::now();
        let suspended = created + Duration::from_millis(20);
        let resumed = suspended + Duration::from_millis(200);
        let from = counted_from(created, suspended, resumed);
        assert_eq!(from - created, Duration::from_millis(200));
        let visible = resumed + Duration::from_millis(30);
        assert_eq!(visible - from, Duration::from_millis(50));
    }

    #[test]
    fn the_time_runs_from_the_start_point_until_the_window_is_first_seen() {
        let calls = Cell::new(0);
        let visible = || {
            calls.set(calls.get() + 1);
            Ok(calls.get() >= 4)
        };
        let ms = wait_until_visible(Instant::now(), Duration::from_secs(5), &visible).unwrap();
        // Three polls came back no, each followed by a sleep of at least POLL.
        assert!(ms >= 3 * POLL.as_millis() as u64, "{ms}");
        assert_eq!(calls.get(), 4);
    }

    #[test]
    fn a_window_that_is_there_at_once_answers_without_waiting() {
        let ms = wait_until_visible(Instant::now(), Duration::from_secs(5), &|| Ok(true)).unwrap();
        assert!(ms < 1000, "{ms}");
    }

    #[test]
    fn no_window_within_the_limit_is_an_error_naming_the_limit() {
        let cause = wait_until_visible(Instant::now(), Duration::from_millis(30), &|| Ok(false))
            .unwrap_err();
        assert!(cause.contains("no window within 30ms"), "{cause}");
    }

    #[test]
    fn a_failing_check_ends_the_wait_with_its_cause() {
        let cause = wait_until_visible(Instant::now(), Duration::from_secs(5), &|| {
            Err("floawty exited before it showed a window".to_string())
        })
        .unwrap_err();
        assert_eq!(cause, "floawty exited before it showed a window");
    }

    #[test]
    fn the_started_line_gives_the_milliseconds_or_the_error() {
        assert_eq!(started_line(Ok(183)), "started 183");
        assert_eq!(started_line(Err("no window".into())), "error no window");
    }
}
