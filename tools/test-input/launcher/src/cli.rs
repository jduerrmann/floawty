//! The command line of the launcher: its two modes and how a command is passed on.
use std::time::Duration;

pub const USAGE: &str = "usage:\n  test-input run [--visible] [--timeout-s N] -- <command> [args...]\n  test-input floawty [--report-start] <floawty.exe> [args...]";
const DEFAULT_TIMEOUT_S: u64 = 1800;

#[derive(Debug, PartialEq, Eq)]
pub enum Mode {
    Run {
        /// On the real desktop instead of a hidden one; the lock, job and time limit stay.
        visible: bool,
        timeout: Duration,
        command: Vec<String>,
    },
    Floawty {
        /// Also report the time from resuming floawty to its visible window.
        report_start: bool,
        exe: String,
        args: Vec<String>,
    },
}

/// Parses the arguments after the program name.
pub fn parse(args: &[String]) -> Result<Mode, String> {
    match args.split_first() {
        Some((mode, rest)) if mode == "run" => parse_run(rest),
        Some((mode, rest)) if mode == "floawty" => parse_floawty(rest),
        Some((mode, _)) => Err(format!("unknown mode {mode}\n{USAGE}")),
        None => Err(USAGE.to_string()),
    }
}

fn parse_run(args: &[String]) -> Result<Mode, String> {
    let mut timeout = Duration::from_secs(DEFAULT_TIMEOUT_S);
    let mut visible = false;
    let mut args = args.iter();
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--" => return run_command(visible, timeout, args.cloned().collect()),
            "--visible" => visible = true,
            "--timeout-s" => timeout = seconds(args.next())?,
            option if option.starts_with("--") => return Err(format!("unknown option {option}")),
            _ => break,
        }
    }
    Err(format!("run needs -- before the command\n{USAGE}"))
}

fn seconds(value: Option<&String>) -> Result<Duration, String> {
    let value = value.ok_or("--timeout-s needs a number of seconds")?;
    match value.parse::<u64>() {
        Ok(seconds) if seconds > 0 => Ok(Duration::from_secs(seconds)),
        _ => Err(format!(
            "--timeout-s {value}: not a positive number of seconds"
        )),
    }
}

fn run_command(visible: bool, timeout: Duration, command: Vec<String>) -> Result<Mode, String> {
    if command.is_empty() {
        return Err(format!("run needs a command after --\n{USAGE}"));
    }
    Ok(Mode::Run {
        visible,
        timeout,
        command,
    })
}

fn parse_floawty(args: &[String]) -> Result<Mode, String> {
    let report_start = args.first().is_some_and(|arg| arg == "--report-start");
    let (exe, args) = args[usize::from(report_start)..]
        .split_first()
        .ok_or(format!("floawty needs the path of the exe\n{USAGE}"))?;
    Ok(Mode::Floawty {
        report_start,
        exe: exe.clone(),
        args: args.to_vec(),
    })
}

/// Joins arguments into one command line the way `CommandLineToArgvW` splits it again.
pub fn command_line(arguments: &[String]) -> String {
    let quoted: Vec<String> = arguments.iter().map(|argument| quote(argument)).collect();
    quoted.join(" ")
}

fn quote(argument: &str) -> String {
    let plain = !argument.is_empty() && !argument.contains([' ', '\t', '"']);
    if plain {
        return argument.to_string();
    }
    let mut quoted = String::from('"');
    let mut backslashes = 0;
    for character in argument.chars() {
        match character {
            '\\' => backslashes += 1,
            '"' => {
                quoted.push_str(&"\\".repeat(backslashes * 2 + 1));
                quoted.push('"');
                backslashes = 0;
            }
            other => {
                quoted.push_str(&"\\".repeat(backslashes));
                quoted.push(other);
                backslashes = 0;
            }
        }
    }
    quoted.push_str(&"\\".repeat(backslashes * 2));
    quoted.push('"');
    quoted
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(text: &str) -> Vec<String> {
        text.split_whitespace().map(str::to_string).collect()
    }

    fn run(timeout_s: u64, command: &str) -> Mode {
        Mode::Run {
            visible: false,
            timeout: Duration::from_secs(timeout_s),
            command: args(command),
        }
    }

    #[test]
    fn run_takes_the_command_after_the_double_dash_with_a_default_timeout() {
        assert_eq!(
            parse(&args("run -- cmd /c echo hi")),
            Ok(run(1800, "cmd /c echo hi"))
        );
    }

    #[test]
    fn run_visible_takes_the_same_command_and_timeout_on_the_real_desktop() {
        let visible = |timeout_s, command| match run(timeout_s, command) {
            Mode::Run {
                timeout, command, ..
            } => Mode::Run {
                visible: true,
                timeout,
                command,
            },
            other => other,
        };
        assert_eq!(
            parse(&args("run --visible -- cmd /c echo hi")),
            Ok(visible(1800, "cmd /c echo hi"))
        );
        assert_eq!(
            parse(&args("run --timeout-s 7 --visible -- x")),
            Ok(visible(7, "x"))
        );
        assert_eq!(
            parse(&args("run --visible --timeout-s 7 -- x")),
            Ok(visible(7, "x"))
        );
    }

    #[test]
    fn a_visible_flag_after_the_double_dash_stays_with_the_command() {
        assert_eq!(
            parse(&args("run -- tool --visible")),
            Ok(run(1800, "tool --visible"))
        );
    }

    #[test]
    fn run_takes_a_timeout_in_seconds() {
        assert_eq!(
            parse(&args("run --timeout-s 5 -- cmd /c exit 3")),
            Ok(run(5, "cmd /c exit 3"))
        );
    }

    #[test]
    fn options_of_the_command_itself_stay_with_it() {
        assert_eq!(
            parse(&args("run -- tool --timeout-s 9 -- x")),
            Ok(run(1800, "tool --timeout-s 9 -- x"))
        );
    }

    #[test]
    fn run_without_a_double_dash_or_a_command_says_so() {
        assert!(parse(&args("run cmd /c echo")).unwrap_err().contains("--"));
        assert!(parse(&args("run --")).unwrap_err().contains("command"));
        assert!(parse(&args("run")).unwrap_err().contains("--"));
    }

    #[test]
    fn a_bad_timeout_or_option_is_refused_with_its_text() {
        assert!(parse(&args("run --timeout-s abc -- x"))
            .unwrap_err()
            .contains("abc"));
        assert!(parse(&args("run --timeout-s 0 -- x"))
            .unwrap_err()
            .contains("0"));
        assert!(parse(&args("run --timeout-s"))
            .unwrap_err()
            .contains("timeout"));
        assert!(parse(&args("run --speed 3 -- x"))
            .unwrap_err()
            .contains("--speed"));
    }

    #[test]
    fn floawty_takes_the_exe_and_the_arguments_for_it() {
        let expected = Mode::Floawty {
            report_start: false,
            exe: "C:\\x\\floawty.exe".into(),
            args: args("--flag"),
        };
        assert_eq!(
            parse(&args("floawty C:\\x\\floawty.exe --flag")),
            Ok(expected)
        );
    }

    #[test]
    fn floawty_reports_its_start_time_when_asked_to() {
        let expected = Mode::Floawty {
            report_start: true,
            exe: "C:\\x\\floawty.exe".into(),
            args: args("--flag"),
        };
        assert_eq!(
            parse(&args("floawty --report-start C:\\x\\floawty.exe --flag")),
            Ok(expected)
        );
    }

    #[test]
    fn the_report_flag_after_the_exe_stays_with_floawty() {
        let Ok(Mode::Floawty {
            report_start, args, ..
        }) = parse(&args("floawty x.exe --report-start"))
        else {
            panic!("not parsed");
        };
        assert!(!report_start);
        assert_eq!(args, vec!["--report-start".to_string()]);
    }

    #[test]
    fn floawty_needs_an_exe() {
        assert!(parse(&args("floawty")).unwrap_err().contains("exe"));
        assert!(parse(&args("floawty --report-start"))
            .unwrap_err()
            .contains("exe"));
    }

    #[test]
    fn no_mode_or_an_unknown_one_shows_the_usage() {
        assert!(parse(&[]).unwrap_err().contains("usage"));
        let error = parse(&args("dance")).unwrap_err();
        assert!(
            error.contains("dance") && error.contains("usage"),
            "{error}"
        );
    }

    #[test]
    fn plain_arguments_stay_as_they_are() {
        assert_eq!(command_line(&args("cmd /c echo hi")), "cmd /c echo hi");
    }

    #[test]
    fn arguments_with_spaces_quotes_or_nothing_are_quoted() {
        let arguments = vec!["a b".to_string(), "say \"hi\"".to_string(), String::new()];
        assert_eq!(command_line(&arguments), "\"a b\" \"say \\\"hi\\\"\" \"\"");
    }

    #[test]
    fn a_trailing_backslash_before_the_closing_quote_is_doubled() {
        let arguments = vec!["C:\\a b\\".to_string(), "C:\\plain\\".to_string()];
        assert_eq!(command_line(&arguments), "\"C:\\a b\\\\\" C:\\plain\\");
    }
}
