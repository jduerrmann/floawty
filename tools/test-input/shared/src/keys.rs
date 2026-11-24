//! The key names floawty's settings store and their virtual-key codes.

const VK_SPACE: u32 = 0x20;
const FIRST_FUNCTION_KEY: u32 = 0x6F;
const ARROWS: [(&str, u32); 4] = [
    ("LEFT", 0x25),
    ("UP", 0x26),
    ("RIGHT", 0x27),
    ("DOWN", 0x28),
];

/// The virtual-key code of a key name in any case, or `None` for a name floawty never stores.
pub fn virtual_key(name: &str) -> Option<u32> {
    let name = name.to_uppercase();
    match name.as_bytes() {
        [letter @ (b'A'..=b'Z' | b'0'..=b'9')] => Some(u32::from(*letter)),
        _ if name == "SPACE" => Some(VK_SPACE),
        _ => function_key(&name).or_else(|| arrow(&name)),
    }
}

fn function_key(name: &str) -> Option<u32> {
    let number: u32 = name.strip_prefix('F')?.parse().ok()?;
    (1..=24)
        .contains(&number)
        .then_some(FIRST_FUNCTION_KEY + number)
}

fn arrow(name: &str) -> Option<u32> {
    ARROWS
        .iter()
        .find(|(arrow, _)| *arrow == name)
        .map(|(_, vk)| *vk)
}
