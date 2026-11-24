//! Hotkey text as floawty's settings store it ("Ctrl+Alt+Shift+T"), turned into what Windows sees.
use crate::keys::virtual_key;

pub const MOD_ALT: u32 = 0x1;
pub const MOD_CONTROL: u32 = 0x2;
pub const MOD_SHIFT: u32 = 0x4;
pub const MOD_WIN: u32 = 0x8;
pub const MOD_NOREPEAT: u32 = 0x4000;
const MODIFIER_BITS: u32 = MOD_ALT | MOD_CONTROL | MOD_SHIFT | MOD_WIN;

/// A modifier set (without `MOD_NOREPEAT`) and a virtual-key code.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Combo {
    pub mods: u32,
    pub vk: u32,
}

impl Combo {
    /// What `RegisterHotKey` was called with; `MOD_NOREPEAT` does not make a different hotkey.
    pub fn from_register(mods: u32, vk: u32) -> Self {
        Self {
            mods: mods & MODIFIER_BITS,
            vk,
        }
    }
}

/// Parses the hotkey text floawty's settings store: modifiers first, then one key.
pub fn parse(text: &str) -> Result<Combo, String> {
    let mut tokens = text.split('+').map(str::trim).peekable();
    let mut mods = 0;
    let mut vk = None;
    while let Some(token) = tokens.next() {
        if token.is_empty() {
            return Err(format!("hotkey {text:?} has an empty part"));
        }
        if vk.is_some() {
            return Err(format!(
                "hotkey {text:?}: modifiers come first, then one key"
            ));
        }
        match modifier(token) {
            Some(bit) if tokens.peek().is_some() => mods |= bit,
            _ => vk = Some(key(token)?),
        }
    }
    let vk = vk.ok_or_else(|| format!("hotkey {text:?} has no key"))?;
    Ok(Combo { mods, vk })
}

fn modifier(token: &str) -> Option<u32> {
    match token.to_uppercase().as_str() {
        "ALT" => Some(MOD_ALT),
        "CONTROL" | "CTRL" => Some(MOD_CONTROL),
        "SUPER" => Some(MOD_WIN),
        "SHIFT" => Some(MOD_SHIFT),
        _ => None,
    }
}

fn key(token: &str) -> Result<u32, String> {
    virtual_key(token).ok_or_else(|| format!("{token:?} is not a key name floawty's hotkeys know"))
}

/// The `lParam` of `WM_HOTKEY`: modifiers in the low word, the virtual key in the high word.
pub fn wm_hotkey_lparam(combo: Combo) -> isize {
    ((combo.vk << 16) | combo.mods) as isize
}

#[cfg(test)]
mod tests {
    use super::*;

    fn combo(text: &str) -> Combo {
        parse(text).unwrap()
    }

    #[test]
    fn the_default_hotkeys_of_the_settings_parse() {
        let all = MOD_ALT | MOD_CONTROL | MOD_SHIFT;
        assert_eq!(
            combo("Ctrl+Alt+Shift+O"),
            Combo {
                mods: all,
                vk: 0x4F
            }
        );
        assert_eq!(
            combo("Ctrl+Alt+Shift+T"),
            Combo {
                mods: all,
                vk: 0x54
            }
        );
        assert_eq!(
            combo("Ctrl+Alt+Shift+Space"),
            Combo {
                mods: all,
                vk: 0x20
            }
        );
        assert_eq!(
            combo("Ctrl+Alt+Shift+Up"),
            Combo {
                mods: all,
                vk: 0x26
            }
        );
        assert_eq!(
            combo("Ctrl+Alt+Shift+Down"),
            Combo {
                mods: all,
                vk: 0x28
            }
        );
    }

    #[test]
    fn modifier_names_are_the_ones_floawty_stores_in_any_case() {
        assert_eq!(
            combo("control+ALT+SHIFT+f24").mods,
            MOD_CONTROL | MOD_ALT | MOD_SHIFT
        );
        assert_eq!(combo("ctrl+alt+shift+f24").vk, 0x87);
        assert_eq!(combo("Super+K").mods, MOD_WIN);
        assert_eq!(combo(" Ctrl + Alt + K ").mods, MOD_CONTROL | MOD_ALT);
    }

    #[test]
    fn letters_digits_function_keys_space_and_arrows_are_keys() {
        assert_eq!(combo("Ctrl+a").vk, 0x41);
        assert_eq!(combo("Ctrl+Z").vk, 0x5A);
        assert_eq!(combo("Ctrl+5").vk, 0x35);
        assert_eq!(combo("Ctrl+F1").vk, 0x70);
        assert_eq!(combo("Ctrl+Space").vk, 0x20);
        let arrows = ["Left", "Up", "Right", "Down"].map(|name| combo(&format!("Ctrl+{name}")).vk);
        assert_eq!(arrows, [0x25, 0x26, 0x27, 0x28]);
    }

    #[test]
    fn names_floawty_never_writes_are_refused_by_name() {
        for name in [
            "Esc", "Enter", "Numpad7", "KeyA", "ArrowUp", "Digit5", "F25", "Win", "Cmd", "Meta",
        ] {
            let error = parse(&format!("Ctrl+{name}")).unwrap_err();
            assert!(error.contains(name), "{name}: {error}");
        }
        assert!(parse("Win+T").unwrap_err().contains("Win"));
    }

    #[test]
    fn a_key_alone_is_a_hotkey() {
        assert_eq!(combo("F9"), Combo { mods: 0, vk: 0x78 });
    }

    #[test]
    fn invalid_text_is_refused_with_its_cause() {
        for text in [
            "",
            "Ctrl+",
            "+T",
            "Ctrl+Alt",
            "Ctrl",
            "T+Ctrl",
            "Ctrl+T+X",
            "Ctrl+Nope",
        ] {
            assert!(parse(text).is_err(), "{text:?} must not parse");
        }
        assert!(parse("Ctrl+Nope").unwrap_err().contains("Nope"));
    }

    #[test]
    fn the_repeat_flag_does_not_change_the_combination() {
        let plain = Combo::from_register(MOD_CONTROL | MOD_ALT, 0x54);
        assert_eq!(
            Combo::from_register(MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, 0x54),
            plain
        );
    }

    #[test]
    fn wm_hotkey_carries_the_modifiers_low_and_the_key_high() {
        let all = Combo {
            mods: MOD_ALT | MOD_CONTROL | MOD_SHIFT,
            vk: 0x54,
        };
        assert_eq!(wm_hotkey_lparam(all), 0x0054_0007);
        assert_eq!(
            wm_hotkey_lparam(Combo {
                mods: MOD_WIN,
                vk: 0x87
            }),
            0x0087_0008
        );
    }
}
