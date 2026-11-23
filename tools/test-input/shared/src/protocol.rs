//! The launcher's line protocol: commands in, one `ok ...` or `error ...` line out.

#[derive(Debug, PartialEq, Eq)]
pub enum Command {
    Hotkey(String),
    Hold(String),
    Release(String),
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
