//! Which service webviews stay loaded out of sight when the user keeps services awake.
use serde::{Deserialize, Serialize};

use crate::settings::OpenService;

/// The setting "Keep services awake"; unknown values read as `Off`.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum KeepAwake {
    Last,
    Three,
    #[default]
    #[serde(other)]
    Off,
}

/// A service webview loaded out of sight; `number` names its webview.
#[derive(Clone, Debug, PartialEq)]
pub struct Awake {
    pub service: OpenService,
    pub number: u64,
    pub scripted: bool,
}

/// What opening a service does: show an awake webview, and which ones close.
#[derive(Debug, PartialEq)]
pub struct Opening {
    pub show: Option<u64>,
    pub close: Vec<u64>,
}

/// How many may stay out of sight; the setting counts a shown service too.
pub fn room(keep: KeepAwake, showing: bool) -> usize {
    let shown = usize::from(showing);
    match keep {
        KeepAwake::Off => 0,
        KeepAwake::Last => 1 - shown,
        KeepAwake::Three => 3 - shown,
    }
}

/// Opening `service`; `awake` runs from least to most recently used.
pub fn on_open(keep: KeepAwake, awake: &[Awake], service: &OpenService) -> Opening {
    let show = awake
        .iter()
        .find(|entry| entry.service == *service)
        .map(|entry| entry.number);
    // The same tile with other domains or a new address is loaded anew.
    let (stale, others): (Vec<&Awake>, Vec<&Awake>) = awake
        .iter()
        .filter(|entry| Some(entry.number) != show)
        .partition(|entry| entry.service.id == service.id);
    let excess = others.len().saturating_sub(room(keep, true));
    let close = stale
        .iter()
        .chain(others.iter().take(excess))
        .map(|entry| entry.number)
        .collect();
    Opening { show, close }
}

/// The awake ones beyond the setting's room, least recently used first.
pub fn beyond_room(keep: KeepAwake, awake: &[Awake], showing: bool) -> Vec<u64> {
    let excess = awake.len().saturating_sub(room(keep, showing));
    awake[..excess].iter().map(|entry| entry.number).collect()
}

/// Own tiles removed from the list: their awake webviews can never be shown again.
pub fn removed(before: &[String], after: &[String]) -> Vec<String> {
    before
        .iter()
        .filter(|id| !after.contains(id))
        .cloned()
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::settings;

    fn service(id: &str) -> OpenService {
        OpenService {
            id: id.into(),
            url: format!("https://{id}.example/"),
            allowed_domains: vec![format!("{id}.example")],
            sign_in_hosts: Vec::new(),
        }
    }

    fn awake(ids: &[&str]) -> Vec<Awake> {
        (1..)
            .zip(ids)
            .map(|(number, id)| Awake {
                service: service(id),
                number,
                scripted: false,
            })
            .collect()
    }

    #[test]
    fn off_keeps_nothing_and_is_the_default() {
        assert_eq!(room(KeepAwake::Off, false), 0);
        let read = settings::parse(r#"{ "version": 1, "opacity": 0.5 }"#);
        assert_eq!(read.keep_awake, KeepAwake::Off);
        let unknown = settings::parse(r#"{ "keepAwake": "forever" }"#);
        assert_eq!(unknown.keep_awake, KeepAwake::Off);
    }

    #[test]
    fn the_choice_is_written_in_lowercase() {
        let read = settings::parse(r#"{ "keepAwake": "three" }"#);
        assert_eq!(read.keep_awake, KeepAwake::Three);
        let text = serde_json::to_string(&read).expect("settings serialize");
        assert!(text.contains(r#""keepAwake":"three""#), "{text}");
    }

    #[test]
    fn last_keeps_the_service_left_for_the_tiles_and_none_beside_a_shown_one() {
        assert_eq!(room(KeepAwake::Last, false), 1);
        assert_eq!(room(KeepAwake::Last, true), 0);
        assert_eq!(room(KeepAwake::Three, false), 3);
        assert_eq!(room(KeepAwake::Three, true), 2);
    }

    #[test]
    fn returning_shows_the_same_webview_and_closes_nothing_else() {
        let opening = on_open(KeepAwake::Three, &awake(&["a", "b"]), &service("a"));
        assert_eq!(
            opening,
            Opening {
                show: Some(1),
                close: Vec::new()
            }
        );
    }

    #[test]
    fn with_last_another_service_closes_the_awake_one() {
        let opening = on_open(KeepAwake::Last, &awake(&["a"]), &service("b"));
        assert_eq!(
            opening,
            Opening {
                show: None,
                close: vec![1]
            }
        );
    }

    #[test]
    fn with_three_a_fourth_closes_the_least_recently_used() {
        let opening = on_open(KeepAwake::Three, &awake(&["a", "b", "c"]), &service("d"));
        assert_eq!(
            opening,
            Opening {
                show: None,
                close: vec![1]
            }
        );
    }

    #[test]
    fn a_tile_with_other_domains_is_loaded_anew() {
        let mut changed = awake(&["a"]);
        changed[0]
            .service
            .allowed_domains
            .push("more.example".into());
        let opening = on_open(KeepAwake::Three, &changed, &service("a"));
        assert_eq!(
            opening,
            Opening {
                show: None,
                close: vec![1]
            }
        );
    }

    #[test]
    fn a_smaller_setting_closes_the_oldest_first() {
        let three = awake(&["a", "b", "c"]);
        assert_eq!(beyond_room(KeepAwake::Off, &three, false), vec![1, 2, 3]);
        assert_eq!(beyond_room(KeepAwake::Last, &three, false), vec![1, 2]);
        assert_eq!(beyond_room(KeepAwake::Three, &three, true), vec![1]);
    }

    #[test]
    fn only_removed_own_tiles_count() {
        let before = vec!["x".to_string(), "y".to_string()];
        assert_eq!(removed(&before, &["y".to_string()]), vec!["x".to_string()]);
        assert!(removed(&before, &before).is_empty());
    }
}
