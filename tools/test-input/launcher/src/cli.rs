//! The command line of the launcher: its two modes and how a command is passed on.
use std::time::Duration;

pub const USAGE: &str = "usage:\n  test-input run [--timeout-s N] -- <command> [args...]\n  test-input floawty <floawty.exe> [args...]";
const DEFAULT_TIMEOUT_S: u64 = 1800;

#[derive(Debug, PartialEq, Eq)]
pub enum Mode {
    Run {
        timeout: Duration,
        command: Vec<String>,
    },
    Floawty {
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
    let mut args = args.iter();
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--" => return run_command(timeout, args.cloned().collect()),
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

fn run_command(timeout: Duration, command: Vec<String>) -> Result<Mode, String> {
    if command.is_empty() {
        return Err(format!("run needs a command after --\n{USAGE}"));
    }
    Ok(Mode::Run { timeout, command })
}

fn parse_floawty(args: &[String]) -> Result<Mode, String> {
    let (exe, args) = args
        .split_first()
        .ok_or(format!("floawty needs the path of the exe\n{USAGE}"))?;
    Ok(Mode::Floawty {
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
            exe: "C:\\x\\floawty.exe".into(),
            args: args("--flag"),
        };
        assert_eq!(
            parse(&args("floawty C:\\x\\floawty.exe --flag")),
            Ok(expected)
        );
    }

    #[test]
    fn floawty_needs_an_exe() {
        assert!(parse(&args("floawty")).unwrap_err().contains("exe"));
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
