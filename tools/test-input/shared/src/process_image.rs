//! Which program a `CreateProcessW` call starts, and whether that is floawty.

/// The image path of the call: the application name, else the first word of the command line.
pub fn image_of(application: Option<&str>, command_line: Option<&str>) -> Option<String> {
    let application = application.map(str::trim).filter(|name| !name.is_empty());
    application
        .map(str::to_string)
        .or_else(|| first_word(command_line?.trim()))
}

fn first_word(command_line: &str) -> Option<String> {
    let word = match command_line.strip_prefix('"') {
        Some(quoted) => quoted.split('"').next()?,
        None => command_line.split_whitespace().next()?,
    };
    Some(word.to_string())
}

/// True when the call starts floawty: by its image, or by a command line that begins with the caller's own exe path.
pub fn is_floawty_call(
    application: Option<&str>,
    command_line: Option<&str>,
    own_exe: &str,
) -> bool {
    let by_image =
        image_of(application, command_line).is_some_and(|image| is_floawty_image(&image, own_exe));
    let unnamed = application.is_none_or(|name| name.trim().is_empty());
    by_image || (unnamed && starts_with_path(command_line, own_exe))
}

/// An unquoted command line may hold a path with spaces, so the first word cannot name the image.
fn starts_with_path(command_line: Option<&str>, path: &str) -> bool {
    let line = comparable(command_line.unwrap_or_default());
    let rest = line.strip_prefix(&comparable(path));
    rest.is_some_and(|rest| rest.is_empty() || rest.starts_with(char::is_whitespace))
}

fn comparable(text: &str) -> String {
    text.trim().replace('/', "\\").to_lowercase()
}

/// True for a program named `floawty.exe` and for the caller's own exe (a restart under any name).
pub fn is_floawty_image(image: &str, own_exe: &str) -> bool {
    let image = normalised(image);
    file_name(&image) == "floawty.exe" || image == normalised(own_exe)
}

/// Lower case, backslashes and a closing `.exe`, as CreateProcess would resolve a bare name.
fn normalised(path: &str) -> String {
    let path = path.trim().replace('/', "\\").to_lowercase();
    if file_name(&path).contains('.') {
        path
    } else {
        format!("{path}.exe")
    }
}

fn file_name(path: &str) -> &str {
    path.rsplit('\\').next().unwrap_or(path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_application_name_wins_over_the_command_line() {
        let image = image_of(Some(r"C:\a\floawty.exe"), Some("other.exe --x"));
        assert_eq!(image.as_deref(), Some(r"C:\a\floawty.exe"));
    }

    #[test]
    fn a_quoted_command_line_gives_the_path_with_spaces() {
        let image = image_of(
            None,
            Some(r#""C:\Program Files\floawty\floawty.exe" --flag "a b""#),
        );
        assert_eq!(
            image.as_deref(),
            Some(r"C:\Program Files\floawty\floawty.exe")
        );
    }

    #[test]
    fn an_unquoted_command_line_ends_at_the_first_space() {
        let image = image_of(None, Some(r"C:\a\floawty.exe --flag"));
        assert_eq!(image.as_deref(), Some(r"C:\a\floawty.exe"));
    }

    #[test]
    fn no_application_and_no_command_line_give_nothing() {
        assert_eq!(image_of(None, None), None);
        assert_eq!(image_of(None, Some("   ")), None);
        assert_eq!(image_of(Some(""), Some("")), None);
    }

    #[test]
    fn floawty_exe_is_recognised_in_any_folder_and_case() {
        assert!(is_floawty_image(r"C:\x\FLOAWTY.EXE", r"C:\y\app.exe"));
        assert!(is_floawty_image("floawty.exe", r"C:\y\app.exe"));
        assert!(is_floawty_image("floawty", r"C:\y\app.exe"));
        assert!(is_floawty_image("C:/x/floawty.exe", r"C:\y\app.exe"));
    }

    #[test]
    fn the_callers_own_exe_counts_even_under_another_name() {
        assert!(is_floawty_image(
            r"c:\copy\floawty-previous.exe",
            r"C:\copy\Floawty-Previous.exe"
        ));
    }

    const OWN: &str = r"C:\Program Files\floawty\floawty-previous.exe";

    #[test]
    fn an_unquoted_command_line_with_the_callers_own_path_with_spaces_is_floawty() {
        let line = r"C:\Program Files\floawty\floawty-previous.exe --restart";
        assert!(is_floawty_call(None, Some(line), OWN));
        assert!(is_floawty_call(None, Some(&line.to_uppercase()), OWN));
        assert!(is_floawty_call(None, Some(OWN), OWN));
    }

    #[test]
    fn a_call_is_floawty_by_its_application_or_its_quoted_command_line() {
        assert!(is_floawty_call(Some(r"C:\x\floawty.exe"), None, OWN));
        assert!(is_floawty_call(None, Some(r#""C:\x\floawty.exe" a"#), OWN));
        assert!(!is_floawty_call(Some(r"C:\x\cmd.exe"), Some(OWN), OWN));
    }

    #[test]
    fn a_longer_name_that_starts_like_the_own_path_is_not_floawty() {
        let line = r"C:\Program Files\floawty\floawty-previous.exe2 --x";
        assert!(!is_floawty_call(None, Some(line), OWN));
        assert!(!is_floawty_call(None, None, OWN));
    }

    #[test]
    fn other_programs_are_not_floawty() {
        assert!(!is_floawty_image(
            r"C:\x\msedgewebview2.exe",
            r"C:\y\floawty-previous.exe"
        ));
        assert!(!is_floawty_image(
            r"C:\x\floawty-helper.exe",
            r"C:\y\app.exe"
        ));
        assert!(!is_floawty_image("cmd.exe", r"C:\y\app.exe"));
    }
}
