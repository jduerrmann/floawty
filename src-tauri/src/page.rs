//! Page scripts: floawty asks the service page's adapter script; the page never calls floawty.
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::geometry::Aspect;
use crate::logbook;
use crate::mode::Mode;
use crate::overlay::{self, Overlay};
use crate::service;
use crate::settings::Settings;

/// After a title change the page needs a moment before its controls can be judged.
const PROBLEM_CHECK_DELAY: Duration = Duration::from_secs(3);
/// A status is a short aspect and a few problems; anything longer did not come from floawty's script.
const MAX_ANSWER_LEN: usize = 128;
const MAX_ID_LEN: usize = 32;

#[derive(Default)]
pub struct Page {
    scripted: AtomicBool,
    /// Rises with every opened or closed service, so answers from an earlier page are dropped.
    generation: AtomicU64,
    /// Rises with every wake-up, so only the newest delayed check runs.
    wakes: AtomicU64,
    /// Each problem is logged once per opened service, however often the page reports it.
    logged: Mutex<Vec<Problem>>,
    hover: AtomicBool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SyncInput {
    shorts: SyncShorts,
    hover: bool,
    active: bool,
    video_only: bool,
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
    problems: Vec<Problem>,
}

#[derive(Clone, Copy, Debug, PartialEq, Deserialize)]
#[serde(rename_all = "lowercase")]
enum StatusAspect {
    Portrait,
    Landscape,
}

/// What the page script cannot find; the bar warns about it.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Problem {
    ControlsMissing,
    PlayerMissing,
}

impl Problem {
    fn log_line(self) -> &'static str {
        match self {
            Self::ControlsMissing => "page script: the service's controls are missing",
            Self::PlayerMissing => "page script: video only cannot find the player",
        }
    }
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
    asset_script(app, &format!("page/{service_id}.js"))
}

/// The zoom script for every service page; its fixed asset name never passes `valid_id`.
pub fn zoom_script(app: &AppHandle) -> Option<String> {
    asset_script(app, "page/_zoom.js")
}

fn asset_script(app: &AppHandle, path: &str) -> Option<String> {
    let asset = app.asset_resolver().get(path.into())?;
    let text = String::from_utf8(asset.bytes().to_vec()).ok()?;
    // A missing asset falls back to index.html, which must never run inside a service page.
    if text.trim_start().starts_with('<') {
        return None;
    }
    Some(text)
}

/// Zoom works in the floaty view only; window mode shows the page as it is.
fn zoom_wanted(settings: &Settings) -> bool {
    settings.zoom && settings.mode == Mode::Floaty
}

fn zoom_script_call(on: bool) -> String {
    format!("window.__floawtyZoom && window.__floawtyZoom({on})")
}

/// Tells the open service page whether to zoom; a page without the script ignores it.
pub fn push_zoom(app: &AppHandle) {
    let Some(webview) = app.get_webview(service::LABEL) else {
        return;
    };
    let on = zoom_wanted(&app.state::<Overlay>().settings());
    let _ = webview.eval(zoom_script_call(on));
}

/// A service was opened or closed: forget everything the previous page reported.
pub fn reset(app: &AppHandle, scripted: bool) {
    page(app).generation.fetch_add(1, Ordering::SeqCst);
    page(app).scripted.store(scripted, Ordering::SeqCst);
    page(app).logged.lock().unwrap().clear();
    app.state::<Overlay>().set_page_problems(Vec::new());
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
    let shown = overlay::main_window(app).is_visible().unwrap_or(false);
    let active = shown && !overlay.state().settings_open;
    sync_input(&overlay.settings(), hover, active)
}

/// Video only works in the floaty view only; window mode shows the whole page.
fn sync_input(settings: &Settings, hover: bool, active: bool) -> String {
    let shorts = &settings.shorts;
    let input = SyncInput {
        shorts: SyncShorts {
            auto: shorts.auto,
            pause_seconds: shorts.pause_seconds,
            hold_on_hover: shorts.hold_on_hover,
        },
        hover,
        active,
        video_only: settings.video_only && settings.mode == Mode::Floaty,
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
    let mut status = serde_json::from_str::<Option<Status>>(answer)
        .ok()
        .flatten()?;
    status.problems.sort();
    status.problems.dedup();
    Some(status)
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
    if !app
        .state::<Overlay>()
        .set_page_problems(status.problems.clone())
    {
        return;
    }
    let new: Vec<Problem> = {
        let mut logged = state.logged.lock().unwrap();
        let new: Vec<Problem> = status
            .problems
            .into_iter()
            .filter(|p| !logged.contains(p))
            .collect();
        logged.extend(&new);
        new
    };
    for problem in new {
        logbook::write(app, problem.log_line());
    }
    overlay::emit_state(app);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_a_portrait_status() {
        assert_eq!(
            parse(r#"{"aspect":"portrait","problems":[]}"#),
            Some(Status {
                aspect: StatusAspect::Portrait,
                problems: vec![]
            })
        );
    }

    #[test]
    fn reads_each_problem_and_both() {
        let problems = |answer: &str| parse(answer).unwrap().problems;
        assert_eq!(
            problems(r#"{"aspect":"landscape","problems":["controls-missing"]}"#),
            vec![Problem::ControlsMissing]
        );
        assert_eq!(
            problems(r#"{"aspect":"landscape","problems":["player-missing"]}"#),
            vec![Problem::PlayerMissing]
        );
        assert_eq!(
            problems(r#"{"aspect":"landscape","problems":["controls-missing","player-missing"]}"#),
            vec![Problem::ControlsMissing, Problem::PlayerMissing]
        );
    }

    #[test]
    fn a_page_without_script_answers_nothing() {
        assert_eq!(parse("null"), None);
        assert_eq!(parse(""), None);
    }

    #[test]
    fn unknown_values_and_fields_are_ignored() {
        assert_eq!(parse(r#"{"aspect":"square","problems":[]}"#), None);
        assert_eq!(
            parse(r#"{"aspect":"portrait","problems":[],"url":"x"}"#),
            None
        );
        assert_eq!(parse(r#"{"aspect":"portrait","problems":["other"]}"#), None);
    }

    #[test]
    fn the_old_single_problem_shape_is_ignored() {
        assert_eq!(parse(r#"{"aspect":"portrait","problem":null}"#), None);
    }

    #[test]
    fn problems_come_sorted_and_once_each() {
        let answer = r#"{"aspect":"portrait","problems":["player-missing","controls-missing","player-missing"]}"#;
        assert_eq!(
            parse(answer).unwrap().problems,
            vec![Problem::ControlsMissing, Problem::PlayerMissing]
        );
    }

    #[test]
    fn an_overlong_answer_is_ignored() {
        let long = format!(
            r#"{{"aspect":"portrait","problems":[]{}}}"#,
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

    #[test]
    fn video_only_reaches_the_page_only_in_the_floaty_view() {
        let input = |video_only: bool, mode: Mode| {
            let settings = Settings {
                video_only,
                mode,
                ..Settings::default()
            };
            sync_input(&settings, false, true)
        };
        let on = r#""videoOnly":true"#;
        assert!(input(true, Mode::Floaty).contains(on));
        assert!(input(true, Mode::Window).contains(r#""videoOnly":false"#));
        assert!(input(false, Mode::Floaty).contains(r#""videoOnly":false"#));
        assert!(input(false, Mode::Window).contains(r#""videoOnly":false"#));
    }

    #[test]
    fn the_zoom_script_name_can_never_be_a_tile_id() {
        assert!(!valid_id("_zoom"));
    }

    #[test]
    fn zoom_reaches_the_page_only_in_the_floaty_view() {
        let wanted = |zoom: bool, mode: Mode| {
            zoom_wanted(&Settings {
                zoom,
                mode,
                ..Settings::default()
            })
        };
        assert!(wanted(true, Mode::Floaty));
        assert!(!wanted(true, Mode::Window));
        assert!(!wanted(false, Mode::Floaty));
        assert!(!wanted(false, Mode::Window));
    }

    #[test]
    fn the_zoom_script_calls_the_page_function_when_it_exists() {
        assert_eq!(
            zoom_script_call(true),
            "window.__floawtyZoom && window.__floawtyZoom(true)"
        );
        assert!(zoom_script_call(false).ends_with("(false)"));
    }

    #[test]
    fn the_input_has_the_fields_the_page_script_expects() {
        let input = sync_input(&Settings::default(), true, false);
        assert_eq!(
            input,
            r#"{"shorts":{"auto":false,"pauseSeconds":1.0,"holdOnHover":true},"hover":true,"active":false,"videoOnly":false}"#
        );
    }
}
