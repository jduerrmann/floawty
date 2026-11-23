//! What the shim reports about itself, and whether the launcher accepts it.

pub const STATE_VERSION: u32 = 1;

/// The functions the shim replaces in floawty's import table, one bit each.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Hook {
    RegisterHotKey,
    UnregisterHotKey,
    SendInput,
    ShellExecuteW,
    CreateProcessW,
}

impl Hook {
    pub const ALL: [Hook; 5] = [
        Hook::RegisterHotKey,
        Hook::UnregisterHotKey,
        Hook::SendInput,
        Hook::ShellExecuteW,
        Hook::CreateProcessW,
    ];

    pub fn bit(self) -> u32 {
        1 << self as u32
    }

    pub fn name(self) -> &'static str {
        match self {
            Hook::RegisterHotKey => "RegisterHotKey",
            Hook::UnregisterHotKey => "UnregisterHotKey",
            Hook::SendInput => "SendInput",
            Hook::ShellExecuteW => "ShellExecuteW",
            Hook::CreateProcessW => "CreateProcessW",
        }
    }
}

/// One process's report: the state version it speaks and the hooks it patched.
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Handshake {
    pub pid: u32,
    pub version: u32,
    pub patched: u32,
}

pub fn check(expected_version: u32, report: Option<Handshake>) -> Result<(), String> {
    let report = report.ok_or("the shim did not report back: it never started")?;
    if report.version != expected_version {
        return Err(format!(
            "the shim speaks state version {}, the launcher expects {expected_version}",
            report.version
        ));
    }
    let missing: Vec<&str> = Hook::ALL
        .iter()
        .filter(|hook| report.patched & hook.bit() == 0)
        .map(|hook| hook.name())
        .collect();
    if missing.is_empty() {
        return Ok(());
    }
    Err(format!("the shim could not patch: {}", missing.join(", ")))
}

/// Stores a report; a slot of the same pid or of an exited process is reused.
pub fn record(
    slots: &mut [Handshake],
    report: Handshake,
    is_alive: &dyn Fn(u32) -> bool,
) -> Result<(), String> {
    let own = slots.iter().position(|slot| slot.pid == report.pid);
    let reusable = || {
        slots
            .iter()
            .position(|slot| slot.pid == 0 || !is_alive(slot.pid))
    };
    let index = own.or_else(reusable).ok_or("no free handshake slot")?;
    slots[index] = report;
    Ok(())
}

/// Forgets a pid's report, so an earlier process of the same pid can never vouch for a new one.
pub fn clear(slots: &mut [Handshake], pid: u32) {
    for slot in slots.iter_mut().filter(|slot| slot.pid == pid) {
        *slot = Handshake {
            pid: 0,
            version: 0,
            patched: 0,
        };
    }
}

pub fn find(slots: &[Handshake], pid: u32) -> Option<Handshake> {
    slots
        .iter()
        .find(|slot| slot.pid == pid && pid != 0)
        .copied()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn report(version: u32, patched: u32) -> Option<Handshake> {
        Some(Handshake {
            pid: 10,
            version,
            patched,
        })
    }

    fn all() -> u32 {
        Hook::ALL.iter().fold(0, |mask, hook| mask | hook.bit())
    }

    fn slot(pid: u32) -> Handshake {
        Handshake {
            pid,
            version: 1,
            patched: 1,
        }
    }

    #[test]
    fn every_hook_has_its_own_bit_and_a_name() {
        assert_eq!(all().count_ones(), 5);
        assert_eq!(Hook::SendInput.name(), "SendInput");
        assert_eq!(Hook::CreateProcessW.name(), "CreateProcessW");
    }

    #[test]
    fn all_five_patched_with_the_right_version_is_accepted() {
        assert_eq!(check(STATE_VERSION, report(STATE_VERSION, all())), Ok(()));
    }

    #[test]
    fn a_missing_function_is_named() {
        let without_send_input = all() & !Hook::SendInput.bit();
        let error = check(STATE_VERSION, report(STATE_VERSION, without_send_input)).unwrap_err();
        assert!(error.contains("SendInput"), "{error}");
        assert!(!error.contains("RegisterHotKey"), "{error}");
    }

    #[test]
    fn several_missing_functions_are_all_named() {
        let error = check(STATE_VERSION, report(STATE_VERSION, 0)).unwrap_err();
        for hook in Hook::ALL {
            assert!(error.contains(hook.name()), "{error}");
        }
    }

    #[test]
    fn another_state_version_is_refused_with_its_number() {
        let error = check(STATE_VERSION, report(STATE_VERSION + 1, all())).unwrap_err();
        assert!(error.contains("version"), "{error}");
        assert!(error.contains(&(STATE_VERSION + 1).to_string()), "{error}");
    }

    #[test]
    fn no_report_is_refused() {
        assert!(check(STATE_VERSION, None).is_err());
    }

    #[test]
    fn a_report_is_found_by_pid() {
        let mut slots = [slot(0); 4];
        record(&mut slots, slot(10), &|_| true).unwrap();
        assert_eq!(find(&slots, 10), Some(slot(10)));
        assert_eq!(find(&slots, 11), None);
    }

    #[test]
    fn a_cleared_report_is_gone_and_others_stay() {
        let mut slots = [slot(0); 3];
        record(&mut slots, slot(10), &|_| true).unwrap();
        record(&mut slots, slot(11), &|_| true).unwrap();
        clear(&mut slots, 10);
        assert_eq!(find(&slots, 10), None);
        assert_eq!(find(&slots, 11), Some(slot(11)));
    }

    #[test]
    fn clearing_the_pid_zero_changes_nothing() {
        let mut slots = [slot(5), slot(0)];
        clear(&mut slots, 0);
        assert_eq!(find(&slots, 5), Some(slot(5)));
    }

    #[test]
    fn a_second_report_of_the_same_pid_replaces_the_first() {
        let mut slots = [slot(0); 2];
        record(&mut slots, slot(10), &|_| true).unwrap();
        record(
            &mut slots,
            Handshake {
                patched: 7,
                ..slot(10)
            },
            &|_| true,
        )
        .unwrap();
        assert_eq!(find(&slots, 10).unwrap().patched, 7);
        assert_eq!(slots.iter().filter(|slot| slot.pid == 10).count(), 1);
    }

    #[test]
    fn the_slot_of_an_exited_process_is_reused_when_the_table_is_full() {
        let mut slots = [slot(1), slot(2)];
        record(&mut slots, slot(3), &|pid| pid == 2).unwrap();
        assert!(find(&slots, 3).is_some() && find(&slots, 2).is_some());
        assert!(find(&slots, 1).is_none());
    }

    #[test]
    fn a_full_table_of_live_processes_refuses_a_report() {
        let mut slots = [slot(1), slot(2)];
        assert!(record(&mut slots, slot(3), &|_| true).is_err());
    }
}
