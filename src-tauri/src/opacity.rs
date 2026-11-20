//! Opacity of the floaty view: 10–100 %, moved by hotkeys in 10 % steps.

pub const MIN: f64 = 0.1;

pub fn clamp(value: f64) -> f64 {
    if value.is_nan() {
        return 1.0;
    }
    value.clamp(MIN, 1.0)
}

/// Moves opacity by whole 10 % steps and keeps it on the step grid.
pub fn step(current: f64, steps: i32) -> f64 {
    let tenths = (current * 10.0).round() as i32 + steps;
    clamp(f64::from(tenths) / 10.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn opacity_never_leaves_10_to_100_percent() {
        assert_eq!(clamp(0.05), MIN);
        assert_eq!(clamp(1.2), 1.0);
        assert_eq!(clamp(0.55), 0.55);
    }

    #[test]
    fn opacity_steps_stay_on_the_10_percent_grid() {
        assert_eq!(step(0.55, 1), 0.7);
        assert_eq!(step(1.0, 1), 1.0);
        assert_eq!(step(0.2, -1), 0.1);
        assert_eq!(step(0.1, -1), 0.1);
    }
}
