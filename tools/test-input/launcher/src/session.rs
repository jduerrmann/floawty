//! Answers the commands of the line protocol from the shared state.
use test_input_shared::hotkey_text::{self, Combo};
use test_input_shared::protocol::{self, Command};
use test_input_shared::state::Shared;
use test_input_shared::table::{Entry, HotkeyError};

/// What the session needs from the outside: who still lives and how a press reaches a window.
pub struct Outside<'a> {
    pub is_live: &'a dyn Fn(&Entry) -> bool,
    pub post: &'a dyn Fn(&Entry, Combo) -> Result<(), String>,
}

#[derive(Debug, PartialEq, Eq)]
pub struct Handled {
    pub reply: String,
    pub quit: bool,
}

/// Runs one line of the protocol; every line gets exactly one reply.
pub fn handle(shared: &Shared, outside: &Outside, line: &str) -> Handled {
    let command = match protocol::parse_command(line) {
        Ok(command) => command,
        Err(cause) => return replied(protocol::error(&cause)),
    };
    match command {
        Command::Quit => Handled {
            reply: protocol::ok(""),
            quit: true,
        },
        Command::Counts => {
            let (send_input, shell_execute) = shared.counts();
            replied(protocol::counts_reply(send_input, shell_execute))
        }
        Command::Children => {
            let failure = shared.child_error();
            replied(protocol::children_reply(
                &shared.children(),
                failure.as_deref(),
            ))
        }
        Command::Hotkey(text) => answered(press(shared, outside, &text)),
        Command::Hold(text) => answered(hold(shared, outside, &text)),
        Command::Release(text) => answered(release(shared, &text)),
    }
}

fn replied(reply: String) -> Handled {
    Handled { reply, quit: false }
}

fn answered(result: Result<(), String>) -> Handled {
    replied(match result {
        Ok(()) => protocol::ok(""),
        Err(cause) => protocol::error(&cause),
    })
}

/// Posts `WM_HOTKEY` to the window that registered the combination, as Windows would.
fn press(shared: &Shared, outside: &Outside, text: &str) -> Result<(), String> {
    let combo = hotkey_text::parse(text)?;
    let entry = shared.lock()?.table.find(combo, outside.is_live);
    let entry = entry.ok_or_else(|| format!("not registered: {text}"))?;
    (outside.post)(&entry, combo)
}

fn hold(shared: &Shared, outside: &Outside, text: &str) -> Result<(), String> {
    let combo = hotkey_text::parse(text)?;
    let held = shared.lock()?.table.hold(combo, outside.is_live);
    held.map_err(|error| match error {
        HotkeyError::Full => "the hotkey table is full".to_string(),
        _ => format!("already taken: {text}"),
    })
}

fn release(shared: &Shared, text: &str) -> Result<(), String> {
    let combo = hotkey_text::parse(text)?;
    let released = shared.lock()?.table.release(combo);
    released.map_err(|_| format!("not held: {text}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;
    use test_input_shared::table::Owner;

    fn shared() -> Shared {
        static NEXT: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(0);
        let n = NEXT.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        Shared::create(&format!(
            "Local\\floawty-test-input-session-{}-{n}",
            std::process::id()
        ))
        .unwrap()
    }

    fn register(shared: &Shared, id: i32, text: &str) {
        let combo = hotkey_text::parse(text).unwrap();
        let owner = Owner {
            pid: 4,
            tid: 5,
            hwnd: 0x77,
        };
        shared
            .lock()
            .unwrap()
            .table
            .register(owner, id, combo, &|_| true)
            .unwrap();
    }

    fn ask(shared: &Shared, line: &str) -> String {
        let posted = RefCell::new(Vec::new());
        ask_with(shared, line, &posted).reply
    }

    fn ask_with(shared: &Shared, line: &str, posted: &RefCell<Vec<(u64, i32, Combo)>>) -> Handled {
        let post = |entry: &Entry, combo: Combo| {
            posted.borrow_mut().push((entry.hwnd, entry.id, combo));
            Ok(())
        };
        handle(
            shared,
            &Outside {
                is_live: &|_| true,
                post: &post,
            },
            line,
        )
    }

    #[test]
    fn a_press_of_a_registered_hotkey_is_posted_with_its_window_and_id() {
        let shared = shared();
        register(&shared, 9, "Ctrl+Alt+Shift+T");
        let posted = RefCell::new(Vec::new());
        let handled = ask_with(&shared, "hotkey Ctrl+Alt+Shift+T", &posted);
        assert_eq!(
            handled,
            Handled {
                reply: "ok".into(),
                quit: false
            }
        );
        let combo = hotkey_text::parse("Ctrl+Alt+Shift+T").unwrap();
        assert_eq!(*posted.borrow(), vec![(0x77, 9, combo)]);
    }

    #[test]
    fn a_press_of_an_unregistered_hotkey_is_an_error_naming_it() {
        let shared = shared();
        assert_eq!(
            ask(&shared, "hotkey Ctrl+Alt+Shift+T"),
            "error not registered: Ctrl+Alt+Shift+T"
        );
    }

    #[test]
    fn a_press_of_an_invalid_hotkey_is_an_error_with_the_parse_cause() {
        let reply = ask(&shared(), "hotkey Ctrl+Nope");
        assert!(
            reply.starts_with("error ") && reply.contains("Nope"),
            "{reply}"
        );
    }

    #[test]
    fn a_press_that_cannot_be_posted_is_an_error_with_its_cause() {
        let shared = shared();
        register(&shared, 9, "Ctrl+Alt+T");
        let post = |_: &Entry, _: Combo| Err("window is gone".to_string());
        let outside = Outside {
            is_live: &|_| true,
            post: &post,
        };
        assert_eq!(
            handle(&shared, &outside, "hotkey Ctrl+Alt+T").reply,
            "error window is gone"
        );
    }

    #[test]
    fn a_held_combination_is_refused_to_floawty_until_it_is_released() {
        let shared = shared();
        assert_eq!(ask(&shared, "hold Ctrl+Alt+Shift+T"), "ok");
        let combo = hotkey_text::parse("Ctrl+Alt+Shift+T").unwrap();
        let owner = Owner {
            pid: 4,
            tid: 5,
            hwnd: 0x77,
        };
        let refused = shared
            .lock()
            .unwrap()
            .table
            .register(owner, 1, combo, &|_| true);
        assert_eq!(refused, Err(HotkeyError::Taken));
        assert_eq!(ask(&shared, "release Ctrl+Alt+Shift+T"), "ok");
        assert_eq!(
            shared
                .lock()
                .unwrap()
                .table
                .register(owner, 1, combo, &|_| true),
            Ok(())
        );
    }

    #[test]
    fn holding_a_taken_combination_and_releasing_a_free_one_are_errors() {
        let shared = shared();
        register(&shared, 9, "Ctrl+Alt+T");
        assert_eq!(
            ask(&shared, "hold Ctrl+Alt+T"),
            "error already taken: Ctrl+Alt+T"
        );
        assert_eq!(
            ask(&shared, "release Ctrl+Alt+O"),
            "error not held: Ctrl+Alt+O"
        );
    }

    #[test]
    fn counts_report_the_swallowed_calls() {
        let shared = shared();
        shared.add_send_input();
        shared.add_shell_execute();
        shared.add_shell_execute();
        assert_eq!(ask(&shared, "counts"), "ok send_input=1 shell_execute=2");
    }

    #[test]
    fn children_lists_what_floawty_started() {
        let shared = shared();
        assert_eq!(ask(&shared, "children"), "ok");
        shared.record_child(11);
        shared.record_child(22);
        assert_eq!(ask(&shared, "children"), "ok 11 22");
    }

    #[test]
    fn a_child_that_failed_to_start_is_the_reply_instead_of_the_list() {
        let shared = shared();
        shared.record_child(11);
        shared
            .report_child_error("child 12: the shim could not patch: SendInput")
            .unwrap();
        let reply = ask(&shared, "children");
        assert_eq!(
            reply,
            "error child failed: child 12: the shim could not patch: SendInput"
        );
    }

    #[test]
    fn quit_replies_and_asks_to_stop() {
        let handled = ask_with(&shared(), "quit", &RefCell::new(Vec::new()));
        assert_eq!(
            handled,
            Handled {
                reply: "ok".into(),
                quit: true
            }
        );
    }

    #[test]
    fn a_bad_line_gets_an_error_reply_and_the_session_goes_on() {
        let handled = ask_with(&shared(), "dance", &RefCell::new(Vec::new()));
        assert_eq!(
            handled,
            Handled {
                reply: "error unknown command: dance".into(),
                quit: false
            }
        );
    }
}
