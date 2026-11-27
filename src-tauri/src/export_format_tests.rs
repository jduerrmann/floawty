use super::*;
use crate::awake::KeepAwake;
use crate::geometry::Rect;
use crate::mode::Mode;
use crate::opacity;
use crate::settings::{CustomTile, Hotkeys, Language, OpenService, PortraitSize, Shorts, Theme};

const ALLOWED_KEYS: [&str; 13] = [
    "alwaysOnTop",
    "animations",
    "customTiles",
    "fullscreenInWindow",
    "graphicsAcceleration",
    "hotkeys",
    "keepAwake",
    "language",
    "opacity",
    "shorts",
    "theme",
    "videoOnly",
    "zoom",
];

fn tile(id: &str, name: &str, url: &str) -> CustomTile {
    CustomTile {
        id: id.into(),
        name: name.into(),
        url: url.into(),
    }
}

/// Every allow-listed value differs from the default.
fn changed() -> Settings {
    Settings {
        opacity: 0.7,
        hotkeys: Hotkeys {
            zoom: "Ctrl+Alt+Z".into(),
            ..Hotkeys::default()
        },
        custom_tiles: vec![
            tile("custom-1", "My stream", "https://example.com/live"),
            tile("custom-3", "Other", "http://news.example.org/"),
        ],
        language: Language::De,
        theme: Theme::Dark,
        animations: false,
        shorts: Shorts {
            auto: true,
            pause_seconds: 2.5,
            hold_on_hover: false,
            portrait_size: PortraitSize::Separate,
        },
        video_only: true,
        zoom: true,
        graphics_acceleration: false,
        always_on_top: false,
        fullscreen_in_window: false,
        keep_awake: KeepAwake::Three,
        ..Settings::default()
    }
}

/// Everything that stays on this PC differs from the default.
fn local() -> Settings {
    let rect = Rect {
        x: 10,
        y: 20,
        width: 480,
        height: 270,
    };
    Settings {
        mode: Mode::Window,
        floaty: Some(rect),
        floaty_portrait: Some(rect),
        window: Some(rect),
        notice_accepted: true,
        update_check: true,
        last_service: Some(OpenService {
            id: "netflix".into(),
            url: "https://www.netflix.com/browse".into(),
            allowed_domains: vec!["netflix.com".into()],
            sign_in_hosts: vec![],
        }),
        ..Settings::default()
    }
}

fn with(extra: &str) -> String {
    format!(r#"{{ "kind": "floawty-settings", "version": 1 {extra} }}"#)
}

fn import(text: &str) -> Result<Settings, ImportError> {
    check_import(text, &Settings::default())
}

fn json(text: &str) -> serde_json::Value {
    serde_json::from_str(text).unwrap()
}

#[test]
fn the_export_holds_exactly_the_allow_listed_keys_with_marker_and_version() {
    let text = export_text(&Settings {
        keep_awake: KeepAwake::Last,
        ..local()
    });
    let value = json(&text);
    let mut keys: Vec<&str> = value
        .as_object()
        .unwrap()
        .keys()
        .map(String::as_str)
        .collect();
    keys.sort_unstable();
    let mut expected = ALLOWED_KEYS.to_vec();
    expected.extend(["kind", "version"]);
    expected.sort_unstable();
    assert_eq!(keys, expected);
    assert_eq!(value["kind"], "floawty-settings");
    assert_eq!(value["version"], 1);
    assert_eq!(value["keepAwake"], "last");
}

#[test]
fn the_export_is_pretty_printed_with_a_trailing_newline_and_the_marker_first() {
    let text = export_text(&Settings::default());
    assert!(text.ends_with("}\n"), "{text}");
    assert!(text.starts_with("{\n  \"kind\": \"floawty-settings\",\n  \"version\": 1,"));
}

#[test]
fn an_export_imports_back_to_the_same_allow_listed_values() {
    let imported = check_import(&export_text(&changed()), &Settings::default());
    assert_eq!(imported, Ok(changed()));
}

#[test]
fn text_that_is_no_object_is_broken() {
    for text in ["", "{ nope", "[]", "42", "\"floawty-settings\"", "null"] {
        assert_eq!(import(text), Err(ImportError::Broken), "{text:?}");
    }
}

#[test]
fn an_object_without_the_marker_is_no_export() {
    let settings_file = settings_json_of_this_pc();
    for text in [
        "{}",
        r#"{ "opacity": 0.5 }"#,
        r#"{ "kind": "other", "version": 1 }"#,
        r#"{ "kind": 7, "version": 1 }"#,
        r#"{ "name": "some-package", "version": "1.0.0" }"#,
        settings_file.as_str(),
    ] {
        assert_eq!(import(text), Err(ImportError::NotExport), "{text:?}");
    }
}

fn settings_json_of_this_pc() -> String {
    crate::settings::to_json(&local())
}

#[test]
fn a_missing_or_unusable_version_is_broken() {
    let versions = [
        "",
        r#", "version": 0"#,
        r#", "version": "1""#,
        r#", "version": 1.5"#,
        r#", "version": -1"#,
        r#", "version": null"#,
    ];
    for version in versions {
        let text = format!(r#"{{ "kind": "floawty-settings"{version} }}"#);
        assert_eq!(import(&text), Err(ImportError::Broken), "{text}");
    }
}

#[test]
fn a_newer_version_is_refused_before_anything_else_is_read() {
    let text = r#"{ "kind": "floawty-settings", "version": 2, "opacity": "wrong" }"#;
    assert_eq!(import(text), Err(ImportError::NewerVersion));
}

#[test]
fn one_wrong_value_rejects_the_whole_file() {
    for wrong in [
        r#""opacity": "high""#,
        r#""hotkeys": []"#,
        r#""hotkeys": null"#,
        r#""hotkeys": { "zoom": 5 }"#,
        r#""customTiles": {}"#,
        r#""customTiles": [{ "id": "custom-1" }]"#,
        r#""language": 3"#,
        r#""theme": false"#,
        r#""animations": "yes""#,
        r#""shorts": 5"#,
        r#""shorts": []"#,
        r#""shorts": { "auto": "yes" }"#,
        r#""videoOnly": 1"#,
        r#""zoom": null"#,
        r#""graphicsAcceleration": "on""#,
        r#""alwaysOnTop": 0"#,
        r#""fullscreenInWindow": []"#,
        r#""keepAwake": true"#,
        r#""language": "fr""#,
        r#""theme": "sepia""#,
        r#""keepAwake": "five""#,
        r#""shorts": { "portraitSize": "diagonal" }"#,
        r#""customTiles": [["custom-1", "A", "https://a.example.com/"]]"#,
        r#""customTiles": ["x"]"#,
        r#""customTiles": [null]"#,
    ] {
        let text = with(&format!(", {wrong}"));
        assert_eq!(import(&text), Err(ImportError::Broken), "{wrong}");
    }
}

#[test]
fn every_known_word_of_an_enum_is_taken() {
    let text = with(
        r#", "language": "system", "theme": "light", "keepAwake": "last", "shorts": { "portraitSize": "separate" }"#,
    );
    let imported = import(&text).unwrap();
    assert_eq!(imported.language, Language::System);
    assert_eq!(
        (imported.theme, imported.keep_awake),
        (Theme::Light, KeepAwake::Last)
    );
    assert_eq!(imported.shorts.portrait_size, PortraitSize::Separate);
}

#[test]
fn a_hotkey_without_ctrl_alt_or_win_is_refused() {
    for hotkey in [
        "O",
        "Shift+O",
        "Shift+Space",
        "",
        "Ctrl+Alt+NotAKey",
        "Ctrl+",
    ] {
        let text = with(&format!(r#", "hotkeys": {{ "zoom": "{hotkey}" }}"#));
        assert_eq!(import(&text), Err(ImportError::InvalidHotkey), "{hotkey:?}");
    }
}

#[test]
fn two_actions_may_not_share_a_hotkey_however_it_is_written() {
    for hotkey in ["Ctrl+Alt+Shift+O", "Alt+Ctrl+Shift+O"] {
        let text = with(&format!(r#", "hotkeys": {{ "zoom": "{hotkey}" }}"#));
        assert_eq!(import(&text), Err(ImportError::InvalidHotkey), "{hotkey}");
    }
}

#[test]
fn hotkeys_with_ctrl_alt_or_win_are_taken() {
    let text =
        with(r#", "hotkeys": { "zoom": "Ctrl+F5", "videoOnly": "Super+X", "playPause": "Alt+P" }"#);
    let hotkeys = import(&text).unwrap().hotkeys;
    assert_eq!(
        (
            hotkeys.zoom.as_str(),
            hotkeys.video_only.as_str(),
            hotkeys.play_pause.as_str()
        ),
        ("Ctrl+F5", "Super+X", "Alt+P")
    );
}

fn tiles_text(tiles: &[(&str, &str, &str)]) -> String {
    let tiles: Vec<_> = tiles
        .iter()
        .map(|(id, name, url)| serde_json::json!({ "id": id, "name": name, "url": url }))
        .collect();
    with(&format!(
        r#", "customTiles": {}"#,
        serde_json::Value::Array(tiles)
    ))
}

#[test]
fn a_tile_that_breaks_the_panels_rules_is_refused() {
    let long = "x".repeat(41);
    let cases: [&[(&str, &str, &str)]; 14] = [
        &[("tile-1", "A", "https://a.example.com/")],
        &[("custom-0", "A", "https://a.example.com/")],
        &[("custom-", "A", "https://a.example.com/")],
        &[("custom-x", "A", "https://a.example.com/")],
        &[("custom-01", "A", "https://a.example.com/")],
        &[("netflix", "A", "https://a.example.com/")],
        &[
            ("custom-1", "A", "https://a.example.com/"),
            ("custom-1", "B", "https://b.example.com/"),
        ],
        &[("custom-1", "", "https://a.example.com/")],
        &[("custom-1", "   ", "https://a.example.com/")],
        &[("custom-1", &long, "https://a.example.com/")],
        &[("custom-1", "A", "ftp://a.example.com/")],
        &[("custom-1", "A", "https://localhost/")],
        &[("custom-1", "A", "not a url")],
        &[
            ("custom-1", "A", "https://a.example.com/"),
            ("custom-2", "B", "https://a.example.com/"),
        ],
    ];
    for tiles in cases {
        let text = tiles_text(tiles);
        assert_eq!(import(&text), Err(ImportError::InvalidTile), "{tiles:?}");
    }
}

#[test]
fn a_name_of_exactly_40_characters_and_a_trimmed_name_are_taken() {
    let forty = "ä".repeat(40);
    let text = tiles_text(&[
        ("custom-1", &forty, "https://a.example.com/"),
        ("custom-2", "  Padded  ", "http://b.example.com/x"),
    ]);
    let tiles = import(&text).unwrap().custom_tiles;
    assert_eq!(tiles[0].name, forty);
    assert_eq!(
        tiles[1],
        tile("custom-2", "Padded", "http://b.example.com/x")
    );
}

#[test]
fn an_import_replaces_the_tiles_as_a_whole() {
    let current = Settings {
        custom_tiles: vec![tile("custom-9", "Old", "https://old.example.com/")],
        ..Settings::default()
    };
    let text = tiles_text(&[("custom-1", "New", "https://new.example.com/")]);
    let imported = check_import(&text, &current).unwrap();
    assert_eq!(
        imported.custom_tiles,
        vec![tile("custom-1", "New", "https://new.example.com/")]
    );
    assert!(check_import(&with(r#", "customTiles": []"#), &current)
        .unwrap()
        .custom_tiles
        .is_empty());
}

#[test]
fn an_import_never_touches_what_stays_on_this_pc() {
    let hostile = r#", "noticeAccepted": false, "updateCheck": false, "mode": "floaty",
        "floaty": { "x": 1, "y": 2, "width": 3, "height": 4 }, "window": null,
        "floatyPortrait": null, "lastService": null, "theme": "dark""#;
    let imported = check_import(&with(hostile), &local()).unwrap();
    assert_eq!(
        imported,
        Settings {
            theme: Theme::Dark,
            ..local()
        }
    );
}

#[test]
fn an_unknown_key_in_the_file_is_ignored_and_the_current_ones_stay() {
    let mut current = Settings::default();
    current
        .extra
        .insert("fromNewer".into(), serde_json::json!(true));
    let text = with(r#", "futureThing": 1, "zoom": true"#);
    let imported = check_import(&text, &current).unwrap();
    assert!(imported.zoom);
    assert_eq!(imported.extra, current.extra);
}

#[test]
fn keys_missing_from_the_file_keep_the_current_value() {
    let current = Settings {
        opacity: 0.3,
        zoom: true,
        ..Settings::default()
    };
    let imported = check_import(&with(r#", "language": "de""#), &current).unwrap();
    assert_eq!((imported.opacity, imported.zoom), (0.3, true));
    assert_eq!(imported.language, Language::De);
}

#[test]
fn opacity_and_the_shorts_pause_are_kept_in_range_and_the_version_is_current() {
    let imported = import(&with(r#", "opacity": 7, "shorts": { "pauseSeconds": 60 }"#)).unwrap();
    assert_eq!(
        (imported.opacity, imported.shorts.pause_seconds),
        (1.0, 10.0)
    );
    let low = import(&with(r#", "opacity": 0.01"#)).unwrap();
    assert_eq!(low.opacity, opacity::MIN);
    assert_eq!(low.version, crate::settings::CURRENT_VERSION);
}

#[test]
fn a_byte_order_mark_does_not_matter() {
    let text = format!("\u{feff}{}", with(r#", "zoom": true"#));
    assert!(import(&text).unwrap().zoom);
}

#[test]
fn copying_the_allowed_values_leaves_everything_else_alone() {
    let mut target = local();
    copy_allowed(&mut target, &changed());
    assert_eq!(export_text(&target), export_text(&changed()));
    copy_allowed(&mut target, &Settings::default());
    assert_eq!(target, local());
}

#[test]
fn the_error_codes_are_the_ones_the_page_knows() {
    let codes = [
        ImportError::Broken,
        ImportError::NotExport,
        ImportError::NewerVersion,
        ImportError::InvalidHotkey,
        ImportError::InvalidTile,
    ]
    .map(|error| error.code());
    assert_eq!(
        codes,
        [
            "broken",
            "notExport",
            "newerVersion",
            "invalidHotkey",
            "invalidTile"
        ]
    );
}
