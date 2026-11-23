//! `floawty`: starts the exe with the shim, then serves the line protocol on stdin and stdout.
use std::io::BufRead;

use test_input_shared::hotkey_text::{wm_hotkey_lparam, Combo};
use test_input_shared::inject::load_shim;
use test_input_shared::process::{entry_is_live, os_error};
use test_input_shared::protocol;
use test_input_shared::state::{Shared, ENV_NAME};
use test_input_shared::table::Entry;
use windows_sys::Win32::Foundation::HWND;
use windows_sys::Win32::UI::WindowsAndMessaging::{PostMessageW, PostThreadMessageW, WM_HOTKEY};

use crate::cli::command_line;
use crate::job::Job;
use crate::session::{handle, Outside};
use crate::spawn::{floawty_stdio, start_suspended, Child};
use crate::EXIT_LAUNCHER_FAILED;

const SHIM_FILE: &str = "floawty_test_shim.dll";

/// What a started floawty leaves with the launcher; dropping it ends the whole job.
struct Started {
    shared: Shared,
    job: Job,
    child: Child,
}

pub fn run(exe: &str, args: &[String]) -> i32 {
    match start(exe, args) {
        Ok(started) => {
            println!("pid {}", started.child.pid);
            serve(started)
        }
        Err(cause) => {
            println!("{}", protocol::error(&cause));
            EXIT_LAUNCHER_FAILED
        }
    }
}

/// Starts floawty suspended in its own job and resumes it only after a complete handshake.
fn start(exe: &str, args: &[String]) -> Result<Started, String> {
    if !crate::desktop::on_test_desktop() {
        return Err(
            "refused outside a hidden test desktop: start the tests through `test-input run`"
                .into(),
        );
    }
    let shim = shim_path()?;
    let name = format!("Local\\floawty-test-input-{}", std::process::id());
    let shared = Shared::create(&name)?;
    std::env::set_var(ENV_NAME, &name);
    let job = Job::new()?;
    let arguments: Vec<String> = std::iter::once(exe.to_string())
        .chain(args.iter().cloned())
        .collect();
    let child = start_suspended(&command_line(&arguments), None, floawty_stdio()?)?;
    let loaded = job
        .assign(child.process)
        .and_then(|()| load_shim(&shared, child.process, child.pid, &shim));
    if let Err(cause) = loaded {
        child.terminate();
        return Err(cause);
    }
    child.resume();
    Ok(Started { shared, job, child })
}

fn shim_path() -> Result<std::path::PathBuf, String> {
    let launcher =
        std::env::current_exe().map_err(|error| format!("cannot find the launcher: {error}"))?;
    let shim = launcher.with_file_name(SHIM_FILE);
    match shim.is_file() {
        true => Ok(shim),
        false => Err(format!("the shim DLL is missing: {}", shim.display())),
    }
}

/// Answers commands until `quit` or the end of stdin, then ends floawty and everything it started.
fn serve(started: Started) -> i32 {
    let outside = Outside {
        is_live: &entry_is_live,
        post: &post_hotkey,
    };
    for line in std::io::stdin().lock().lines() {
        let Ok(line) = line else { break };
        let handled = handle(&started.shared, &outside, &line);
        println!("{}", handled.reply);
        if handled.quit {
            break;
        }
    }
    started.job.terminate(0);
    0
}

/// The launcher shares floawty's desktop, so it can post what Windows would have posted.
fn post_hotkey(entry: &Entry, combo: Combo) -> Result<(), String> {
    let (id, lparam) = (entry.id as u32 as usize, wm_hotkey_lparam(combo));
    // SAFETY: posts to a window or thread by handle value; Windows refuses a stale one.
    let posted = unsafe {
        match entry.hwnd {
            0 => PostThreadMessageW(entry.tid, WM_HOTKEY, id, lparam),
            hwnd => PostMessageW(hwnd as usize as HWND, WM_HOTKEY, id, lparam),
        }
    };
    match posted {
        0 => Err(os_error("could not post WM_HOTKEY")),
        _ => Ok(()),
    }
}
