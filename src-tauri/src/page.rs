//! Page scripts: floawty asks the service page's adapter script; the page never calls floawty.
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::thread;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::geometry::Aspect;
use crate::logbook;
use crate::overlay::{self, Overlay};
use crate::service;

/// After a title change the page needs a moment before its controls can be judged.
const PROBLEM_CHECK_DELAY: Duration = Duration::from_secs(3);
/// A status is two short fields; anything longer did not come from floawty's script.
const MAX_ANSWER_LEN: usize = 128;
const MAX_ID_LEN: usize = 32;

#[derive(Default)]
pub struct Page {
    scripted: AtomicBool,
    /// Rises with every opened or closed service, so answers from an earlier page are dropped.
    generation: AtomicU64,
    /// Rises with every wake-up, so only the newest delayed check runs.
    wakes: AtomicU64,
    /// The problem is logged once per opened service, however often the page reports it.
    logged: AtomicBool,
    hover: AtomicBool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SyncInput {
    shorts: SyncShorts,
    hover: bool,
    active: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SyncShorts {
    auto: bool,
    pause_seconds: f64,
    hold_on_hover: bool,
}

#[derive(Debug, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Status {
    aspect: StatusAspect,
    problem: Option<Problem>,
}

#[derive(Clone, Copy, Debug, PartialEq, Deserialize)]
#[serde(rename_all = "lowercase")]
enum StatusAspect {
    Portrait,
    Landscape,
}

#[derive(Clone, Copy, Debug, PartialEq, Deserialize)]
#[serde(rename_all = "kebab-case")]
enum Problem {
    ControlsMissing,
}

fn page(app: &AppHandle) -> tauri::State<'_, Page> {
    app.state::<Page>()
}

fn valid_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= MAX_ID_LEN
        && id
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
}

/// The adapter's page script from floawty's own build, if the service has one.
pub fn script(app: &AppHandle, service_id: &str) -> Option<String> {
    if !valid_id(service_id) {
        return None;
    }
    let asset = app.asset_resolver().get(format!("page/{service_id}.js"))?;
    let text = String::from_utf8(asset.bytes().to_vec()).ok()?;
    // A missing asset falls back to index.html, which must never run inside a service page.
    if text.trim_start().starts_with('<') {
        return None;
    }
    Some(text)
}

/// A service was opened or closed: forget everything the previous page reported.
pub fn reset(app: &AppHandle, scripted: bool) {
    page(app).generation.fetch_add(1, Ordering::SeqCst);
    page(app).scripted.store(scripted, Ordering::SeqCst);
    page(app).logged.store(false, Ordering::SeqCst);
    app.state::<Overlay>().set_page_problem(false);
    overlay::set_aspect(app, Aspect::Landscape);
}

/// The page changed (title or load): ask now, and once more when its controls have settled.
pub fn wake(app: &AppHandle) {
    sync(app);
    let ticket = page(app).wakes.fetch_add(1, Ordering::SeqCst) + 1;
    let app = app.clone();
    thread::spawn(move || {
        thread::sleep(PROBLEM_CHECK_DELAY);
        if page(&app).wakes.load(Ordering::SeqCst) == ticket {
            sync(&app);
        }
    });
}

/// The cursor entered or left floawty; only a change is passed on.
pub fn set_hover(app: &AppHandle, inside: bool) {
    if page(app).hover.swap(inside, Ordering::SeqCst) != inside {
        sync(app);
    }
}

/// Hands the page floawty's settings, the hover and whether floawty is seen, and applies the answer.
pub fn sync(app: &AppHandle) {
    let state = page(app);
    if !state.scripted.load(Ordering::SeqCst) {
        return;
    }
    let Some(webview) = app.get_webview(service::LABEL) else {
        return;
    };
    let generation = state.generation.load(Ordering::SeqCst);
    let script = sync_script(&input(app, state.hover.load(Ordering::SeqCst)));
    let handle = app.clone();
    let asked = webview.eval_with_callback(script, move |answer| {
        // On the main thread, like settling and mode changes, so they never interleave.
        let app = handle.clone();
        let _ = handle.run_on_main_thread(move || apply(&app, generation, &answer));
    });
    if let Err(error) = asked {
        logbook::write(app, &format!("could not ask the page script: {error}"));
    }
}

fn input(app: &AppHandle, hover: bool) -> String {
    let overlay = app.state::<Overlay>();
    let shorts = overlay.settings().shorts;
    let state = overlay.state();
    let shown = overlay::main_window(app).is_visible().unwrap_or(false);
    let input = SyncInput {
        shorts: SyncShorts {
            auto: shorts.auto,
            pause_seconds: shorts.pause_seconds,
            hold_on_hover: shorts.hold_on_hover,
        },
        hover,
        active: shown && !state.settings_open,
    };
    serde_json::to_string(&input).expect("the sync input always serializes")
}

fn sync_script(input: &str) -> String {
    format!(
        "(() => {{ try {{ const page = window.__floawty; \
         return page ? page.sync({input}) : null; }} catch {{ return null; }} }})()"
    )
}

/// Reads the page's answer; it comes from a web page, so anything unexpected is ignored.
fn parse(answer: &str) -> Option<Status> {
    if answer.len() > MAX_ANSWER_LEN {
        return None;
    }
    serde_json::from_str::<Option<Status>>(answer)
        .ok()
        .flatten()
}

fn apply(app: &AppHandle, generation: u64, answer: &str) {
    let state = page(app);
    if state.generation.load(Ordering::SeqCst) != generation {
        return;
    }
    let Some(status) = parse(answer) else {
        return;
    };
    let aspect = match status.aspect {
        StatusAspect::Portrait => Aspect::Portrait,
        StatusAspect::Landscape => Aspect::Landscape,
    };
    overlay::set_aspect(app, aspect);
    let missing = status.problem == Some(Problem::ControlsMissing);
    if !app.state::<Overlay>().set_page_problem(missing) {
        return;
    }
    if missing && !state.logged.swap(true, Ordering::SeqCst) {
        logbook::write(app, "page script: the service's controls are missing");
    }
    overlay::emit_state(app);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_a_portrait_status() {
        assert_eq!(
            parse(r#"{"aspect":"portrait","problem":null}"#),
            Some(Status {
                aspect: StatusAspect::Portrait,
                problem: None
            })
        );
    }

    #[test]
    fn reads_a_missing_control() {
        let status = parse(r#"{"aspect":"landscape","problem":"controls-missing"}"#);
        assert_eq!(status.unwrap().problem, Some(Problem::ControlsMissing));
    }

    #[test]
    fn a_page_without_script_answers_nothing() {
        assert_eq!(parse("null"), None);
        assert_eq!(parse(""), None);
    }

    #[test]
    fn unknown_values_and_fields_are_ignored() {
        assert_eq!(parse(r#"{"aspect":"square","problem":null}"#), None);
        assert_eq!(
            parse(r#"{"aspect":"portrait","problem":null,"url":"x"}"#),
            None
        );
        assert_eq!(parse(r#"{"aspect":"portrait","problem":"other"}"#), None);
    }

    #[test]
    fn an_overlong_answer_is_ignored() {
        let long = format!(
            r#"{{"aspect":"portrait","problem":null{}}}"#,
            " ".repeat(200)
        );
        assert_eq!(parse(&long), None);
    }

    #[test]
    fn only_plain_service_ids_name_a_script() {
        assert!(valid_id("youtube"));
        assert!(valid_id("custom-1"));
        assert!(!valid_id("../index"));
        assert!(!valid_id("YouTube"));
        assert!(!valid_id(""));
    }

    #[test]
    fn the_sync_script_embeds_the_input_as_json() {
        let script = sync_script(r#"{"hover":true}"#);
        assert!(script.contains(r#"page.sync({"hover":true})"#));
    }
}
