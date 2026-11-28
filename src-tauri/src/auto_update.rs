//! Automatic updates: the schedule of the checks and what a found update leads to.
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, Sender};
use std::time::{Duration, Instant};

use tauri::{AppHandle, Manager};
use tauri_plugin_updater::Update;

use crate::distribution::Build;
use crate::logbook;
use crate::overlay::{self, Overlay};
use crate::updates::{self, Updates};

const DAY: Duration = Duration::from_secs(24 * 60 * 60);

/// When the dedicated thread checks: at once when turned on, then every 24 hours, never while off.
#[derive(Default)]
pub struct Schedule {
    due: Option<Instant>,
}

impl Schedule {
    /// The switch was set (reported only when it changes, and once at start); true means check now.
    pub fn set(&mut self, on: bool, now: Instant) -> bool {
        match (on, self.due) {
            (true, None) => {
                self.due = Some(now + DAY);
                true
            }
            (false, _) => {
                self.due = None;
                false
            }
            (true, Some(_)) => false,
        }
    }

    /// The wait ran out; true means check now.
    pub fn tick(&mut self, now: Instant) -> bool {
        let due = self.due.is_some_and(|due| due <= now);
        if due {
            self.due = Some(now + DAY);
        }
        due
    }

    /// How long to wait for the next check; `None` while off.
    pub fn wait(&self, now: Instant) -> Option<Duration> {
        self.due.map(|due| due.saturating_duration_since(now))
    }
}

#[derive(Debug, PartialEq, Eq)]
pub enum Plan {
    /// The portable build only remembers the version.
    Remember,
    /// This version is already downloaded.
    Keep,
    Download,
}

pub fn plan(installed: bool, ready: Option<&str>, found: &str) -> Plan {
    match (installed, ready) {
        (false, _) => Plan::Remember,
        (true, Some(ready)) if ready == found => Plan::Keep,
        (true, _) => Plan::Download,
    }
}

/// What a user quit installs: a downloaded update, in the installed build, while the switch is on.
pub fn quit_install<T>(installed: bool, automatic: bool, ready: Option<T>) -> Option<T> {
    ready.filter(|_| installed && automatic)
}

struct Switch(Sender<bool>);

/// Starts the thread that checks as the schedule says; the first message is the stored choice.
pub fn start(app: &AppHandle) {
    let (sender, receiver) = mpsc::channel();
    let _ = sender.send(app.state::<Overlay>().settings().update_check);
    app.manage(Switch(sender));
    let app = app.clone();
    std::thread::spawn(move || run(&app, &receiver));
}

/// The user turned "Update automatically" on or off.
pub fn set_switch(app: &AppHandle, on: bool) {
    let _ = app.state::<Switch>().0.send(on);
}

fn run(app: &AppHandle, messages: &Receiver<bool>) {
    let mut schedule = Schedule::default();
    loop {
        let message = match schedule.wait(Instant::now()) {
            Some(wait) => messages.recv_timeout(wait),
            None => messages.recv().map_err(|_| RecvTimeoutError::Disconnected),
        };
        let now = Instant::now();
        let check = match message {
            Ok(on) => {
                if !on {
                    forget(app);
                }
                schedule.set(on, now)
            }
            Err(RecvTimeoutError::Timeout) => schedule.tick(now),
            Err(RecvTimeoutError::Disconnected) => return,
        };
        if check {
            check_now(app);
        }
    }
}

fn publish(app: &AppHandle, found: Option<String>, ready: bool) {
    if app.state::<Overlay>().set_update(found, ready) {
        overlay::emit_state(app);
    }
}

/// Turned off, or up to date: no downloaded update installs by itself any more.
fn forget(app: &AppHandle) {
    app.state::<Updates>().take_ready();
    publish(app, None, false);
}

fn check_now(app: &AppHandle) {
    let found = match tauri::async_runtime::block_on(updates::find_update(app, false)) {
        Ok(found) => found,
        Err(error) => {
            let message = updates::failure_message("automatic update check", &error);
            logbook::write(app, &message);
            return;
        }
    };
    let Some(update) = found else {
        logbook::write(app, "automatic update check: up to date");
        forget(app);
        return;
    };
    logbook::write(
        app,
        &format!("automatic update check: {} available", update.version),
    );
    let ready = app.state::<Updates>().ready_version();
    let installed = Build::current() == Build::Installed;
    match plan(installed, ready.as_deref(), &update.version) {
        Plan::Keep => {}
        Plan::Remember => publish(app, Some(update.version), false),
        Plan::Download => download(app, update),
    }
}

fn download(app: &AppHandle, update: Update) {
    let version = update.version.clone();
    match tauri::async_runtime::block_on(update.download(|_, _| {}, || {})) {
        Ok(bytes) => {
            // Only now the newer version replaces an older download.
            app.state::<Updates>().set_ready(update, bytes);
            logbook::write(
                app,
                &format!("update {version} downloaded, installs on quit"),
            );
            publish(app, Some(version), true);
        }
        Err(error) => {
            let message = updates::failure_message("automatic update download", &error);
            logbook::write(app, &message);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn later(start: Instant, hours: u64) -> Instant {
        start + Duration::from_secs(hours * 3600)
    }

    #[test]
    fn nothing_is_due_while_the_switch_is_off() {
        let (start, mut schedule) = (Instant::now(), Schedule::default());
        assert!(!schedule.set(false, start));
        assert_eq!(schedule.wait(start), None);
        assert!(!schedule.tick(later(start, 48)));
    }

    #[test]
    fn turning_it_on_checks_at_once_and_then_waits_a_day() {
        let (start, mut schedule) = (Instant::now(), Schedule::default());
        assert!(schedule.set(true, start));
        assert_eq!(schedule.wait(start), Some(DAY));
        assert_eq!(
            schedule.wait(later(start, 5)),
            Some(DAY - Duration::from_secs(5 * 3600))
        );
    }

    #[test]
    fn setting_it_on_again_does_not_check_or_move_the_day() {
        let (start, mut schedule) = (Instant::now(), Schedule::default());
        schedule.set(true, start);
        assert!(!schedule.set(true, later(start, 5)));
        assert_eq!(
            schedule.wait(later(start, 5)),
            Some(DAY - Duration::from_secs(5 * 3600))
        );
    }

    #[test]
    fn after_a_day_it_checks_and_waits_another_day() {
        let (start, mut schedule) = (Instant::now(), Schedule::default());
        schedule.set(true, start);
        assert!(!schedule.tick(later(start, 23)));
        assert!(schedule.tick(later(start, 24)));
        assert_eq!(schedule.wait(later(start, 24)), Some(DAY));
    }

    #[test]
    fn turning_it_off_stops_the_checks_and_turning_it_on_checks_at_once() {
        let (start, mut schedule) = (Instant::now(), Schedule::default());
        schedule.set(true, start);
        assert!(!schedule.set(false, later(start, 1)));
        assert_eq!(schedule.wait(later(start, 1)), None);
        assert!(!schedule.tick(later(start, 30)));
        assert!(schedule.set(true, later(start, 31)));
    }

    #[test]
    fn the_portable_build_only_remembers_the_version() {
        assert_eq!(plan(false, None, "0.1.1"), Plan::Remember);
    }

    #[test]
    fn a_new_version_downloads_once() {
        assert_eq!(plan(true, None, "0.1.1"), Plan::Download);
        assert_eq!(plan(true, Some("0.1.1"), "0.1.1"), Plan::Keep);
    }

    #[test]
    fn a_newer_version_replaces_the_downloaded_one() {
        assert_eq!(plan(true, Some("0.1.1"), "0.1.2"), Plan::Download);
    }

    #[test]
    fn a_user_quit_with_a_ready_update_installs_it() {
        assert_eq!(quit_install(true, true, Some("0.1.1")), Some("0.1.1"));
    }

    #[test]
    fn a_quit_without_a_ready_update_just_exits() {
        assert_eq!(quit_install::<&str>(true, true, None), None);
    }

    #[test]
    fn the_portable_build_never_installs() {
        assert_eq!(quit_install(false, true, Some("0.1.1")), None);
    }

    #[test]
    fn a_quit_after_switching_it_off_does_not_install() {
        assert_eq!(quit_install(true, false, Some("0.1.1")), None);
    }
}
