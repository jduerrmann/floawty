//! The launcher's line protocol: commands in, one `ok ...` or `error ...` line out.
use crate::input::{Button, Foreground};

#[derive(Debug, PartialEq, Eq)]
pub enum Command {
    Hotkey(String),
    Hold(String),
    Release(String),
    /// The cursor at a physical screen point, or `None` for "no cursor".
    Cursor(Option<(i32, i32)>),
    Button(Button, bool),
    Foreground(Foreground),
    Counts,
    Children,
    Quit,
}

pub fn parse_command(line: &str) -> Result<Command, String> {
    let line = line.trim();
    let (name, argument) = line.split_once(char::is_whitespace).unwrap_or((line, ""));
    let argument = argument.trim();
    match name {
        "" => Err("empty command".into()),
        "counts" => Ok(Command::Counts),
        "children" => Ok(Command::Children),
        "quit" => Ok(Command::Quit),
        "hotkey" => with_hotkey(name, argument, Command::Hotkey),
        "hold" => with_hotkey(name, argument, Command::Hold),
        "release" => with_hotkey(name, argument, Command::Release),
        "cursor" => parse_cursor(argument),
        "button" => parse_button(argument),
        "foreground" => parse_foreground(argument),
        _ => Err(format!("unknown command: {name}")),
    }
}

fn with_hotkey(
    name: &str,
    argument: &str,
    command: fn(String) -> Command,
) -> Result<Command, String> {
    if argument.is_empty() {
        return Err(format!(
            "{name} needs a hotkey, for example: {name} Ctrl+Alt+Shift+T"
        ));
    }
    Ok(command(argument.to_string()))
}

fn parse_cursor(argument: &str) -> Result<Command, String> {
    let usage = || "cursor needs a point or none, for example: cursor X Y".to_string();
    if argument == "none" {
        return Ok(Command::Cursor(None));
    }
    let numbers: Vec<Result<i32, _>> = argument.split_whitespace().map(str::parse).collect();
    match numbers.as_slice() {
        [Ok(x), Ok(y)] => Ok(Command::Cursor(Some((*x, *y)))),
        _ => Err(usage()),
    }
}

fn parse_button(argument: &str) -> Result<Command, String> {
    let words: Vec<&str> = argument.split_whitespace().collect();
    let state = |word| match word {
        "down" => Some(true),
        "up" => Some(false),
        _ => None,
    };
    match words.as_slice() {
        [button, state_word] => Button::parse(button)
            .zip(state(*state_word))
            .map(|(button, down)| Command::Button(button, down))
            .ok_or_else(button_usage),
        _ => Err(button_usage()),
    }
}

fn button_usage() -> String {
    "button needs a button and a state: button left|right down|up".to_string()
}

fn parse_foreground(argument: &str) -> Result<Command, String> {
    Foreground::parse(argument)
        .map(Command::Foreground)
        .ok_or_else(|| "foreground needs a state: foreground main|sign-in|other|none".to_string())
}

pub fn ok(detail: &str) -> String {
    match detail {
        "" => "ok".to_string(),
        detail => format!("ok {detail}"),
    }
}

pub fn error(cause: &str) -> String {
    format!("error {cause}")
}

/// The pids of the children floawty started, or the cause of the one that failed to start.
pub fn children_reply(pids: &[u32], failure: Option<&str>) -> String {
    if let Some(cause) = failure {
        return error(&format!("child failed: {cause}"));
    }
    let pids: Vec<String> = pids.iter().map(u32::to_string).collect();
    ok(&pids.join(" "))
}

pub fn counts_reply(send_input: u32, shell_execute: u32) -> String {
    ok(&format!(
        "send_input={send_input} shell_execute={shell_execute}"
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn hotkey(text: &str) -> String {
        text.to_string()
    }

    #[test]
    fn each_command_is_parsed_with_its_argument() {
        let text = "Ctrl+Alt+Shift+T";
        assert_eq!(
            parse_command("hotkey Ctrl+Alt+Shift+T"),
            Ok(Command::Hotkey(hotkey(text)))
        );
        assert_eq!(
            parse_command("hold Ctrl+Alt+Shift+T"),
            Ok(Command::Hold(hotkey(text)))
        );
        assert_eq!(
            parse_command("release Ctrl+Alt+Shift+T"),
            Ok(Command::Release(hotkey(text)))
        );
        assert_eq!(parse_command("counts"), Ok(Command::Counts));
        assert_eq!(parse_command("children"), Ok(Command::Children));
        assert_eq!(parse_command("quit"), Ok(Command::Quit));
    }

    #[test]
    fn the_cursor_is_a_point_with_negative_coordinates_allowed_or_none() {
        assert_eq!(
            parse_command("cursor 100 200"),
            Ok(Command::Cursor(Some((100, 200))))
        );
        assert_eq!(
            parse_command("cursor -1920  -5"),
            Ok(Command::Cursor(Some((-1920, -5))))
        );
        assert_eq!(parse_command("cursor none"), Ok(Command::Cursor(None)));
    }

    #[test]
    fn a_bad_cursor_names_the_usage() {
        for line in [
            "cursor",
            "cursor 5",
            "cursor 5 x",
            "cursor 1.5 2",
            "cursor 1 2 3",
            "cursor nowhere",
        ] {
            let cause = parse_command(line).unwrap_err();
            assert!(cause.contains("cursor X Y"), "{line:?}: {cause}");
        }
    }

    #[test]
    fn a_button_goes_down_or_up() {
        assert_eq!(
            parse_command("button left down"),
            Ok(Command::Button(Button::Left, true))
        );
        assert_eq!(
            parse_command("button right up"),
            Ok(Command::Button(Button::Right, false))
        );
        for line in [
            "button",
            "button left",
            "button middle down",
            "button left sideways",
        ] {
            let cause = parse_command(line).unwrap_err();
            assert!(
                cause.contains("button left|right down|up"),
                "{line:?}: {cause}"
            );
        }
    }

    #[test]
    fn the_foreground_is_one_of_four_states() {
        let state = |line| parse_command(line);
        assert_eq!(
            state("foreground main"),
            Ok(Command::Foreground(Foreground::Main))
        );
        assert_eq!(
            state("foreground sign-in"),
            Ok(Command::Foreground(Foreground::SignIn))
        );
        assert_eq!(
            state("foreground other"),
            Ok(Command::Foreground(Foreground::Other))
        );
        assert_eq!(
            state("foreground none"),
            Ok(Command::Foreground(Foreground::None))
        );
        for line in ["foreground", "foreground bar", "foreground main now"] {
            let cause = parse_command(line).unwrap_err();
            assert!(
                cause.contains("foreground main|sign-in|other|none"),
                "{line:?}: {cause}"
            );
        }
    }

    #[test]
    fn surrounding_whitespace_and_the_line_end_are_ignored() {
        assert_eq!(
            parse_command("  hotkey   Ctrl + Alt + T \r\n"),
            Ok(Command::Hotkey(hotkey("Ctrl + Alt + T")))
        );
        assert_eq!(parse_command("quit\r\n"), Ok(Command::Quit));
    }

    #[test]
    fn a_command_without_its_argument_is_an_error_with_the_usage() {
        for line in ["hotkey", "hold  ", "release"] {
            let cause = parse_command(line).unwrap_err();
            assert!(cause.contains("needs"), "{line:?}: {cause}");
        }
    }

    #[test]
    fn an_unknown_or_empty_command_names_itself() {
        assert!(parse_command("dance now").unwrap_err().contains("dance"));
        assert!(parse_command("").unwrap_err().contains("empty"));
    }

    #[test]
    fn the_children_reply_lists_pids_or_names_the_failure() {
        assert_eq!(children_reply(&[], None), "ok");
        assert_eq!(children_reply(&[11, 22], None), "ok 11 22");
        let failed = children_reply(&[11], Some("shim did not load"));
        assert_eq!(failed, "error child failed: shim did not load");
    }

    #[test]
    fn replies_have_their_prefix() {
        assert_eq!(ok(""), "ok");
        assert_eq!(ok("x=1"), "ok x=1");
        assert_eq!(error("not registered: T"), "error not registered: T");
        assert_eq!(counts_reply(2, 1), "ok send_input=2 shell_execute=1");
    }
}
