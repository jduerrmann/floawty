//! Runs app tests on a hidden desktop and starts floawty with the test shim (see `cli::USAGE`).
mod cli;
mod desktop;
mod floawty;
mod job;
mod run;
mod session;
mod spawn;

use cli::Mode;

/// The launcher itself failed, as opposed to the command it ran.
const EXIT_LAUNCHER_FAILED: i32 = 125;

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let code = match cli::parse(&args) {
        Ok(Mode::Run { timeout, command }) => run::run(timeout, &command),
        Ok(Mode::Floawty { exe, args }) => floawty::run(&exe, &args),
        Err(cause) => {
            eprintln!("test-input: {cause}");
            EXIT_LAUNCHER_FAILED
        }
    };
    std::process::exit(code);
}
