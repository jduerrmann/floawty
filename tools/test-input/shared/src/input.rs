//! The cursor, mouse buttons and foreground a test sets, and what floawty's calls answer for them.
use crate::windows::Windows;

pub const VK_LBUTTON: i32 = 0x01;
pub const VK_RBUTTON: i32 = 0x02;
/// `GetAsyncKeyState` sets the top bit of its result while the key is down.
const KEY_DOWN: i16 = i16::MIN;

/// Which window has the foreground; a freshly started floawty has it, as in Windows.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Foreground {
    Main = 0,
    SignIn = 1,
    Other = 2,
    None = 3,
}

impl Foreground {
    pub fn parse(text: &str) -> Option<Foreground> {
        match text {
            "main" => Some(Foreground::Main),
            "sign-in" => Some(Foreground::SignIn),
            "other" => Some(Foreground::Other),
            "none" => Some(Foreground::None),
            _ => None,
        }
    }

    fn from_raw(raw: u32) -> Foreground {
        match raw {
            1 => Foreground::SignIn,
            2 => Foreground::Other,
            3 => Foreground::None,
            _ => Foreground::Main,
        }
    }

    fn is_floawty(self) -> bool {
        matches!(self, Foreground::Main | Foreground::SignIn)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Button {
    Left,
    Right,
}

impl Button {
    pub fn parse(text: &str) -> Option<Button> {
        match text {
            "left" => Some(Button::Left),
            "right" => Some(Button::Right),
            _ => None,
        }
    }

    fn bit(self) -> u32 {
        1 << self as u32
    }

    fn from_vk(vk: i32) -> Option<Button> {
        match vk {
            VK_LBUTTON => Some(Button::Left),
            VK_RBUTTON => Some(Button::Right),
            _ => None,
        }
    }
}

/// What the test set; all zero is the start state: no cursor, buttons up, floawty in front.
#[repr(C)]
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct Input {
    cursor_set: u32,
    cursor_x: i32,
    cursor_y: i32,
    buttons: u32,
    foreground: u32,
    input_sent: u32,
}

impl Input {
    pub fn set_cursor(&mut self, point: Option<(i32, i32)>) {
        let (x, y) = point.unwrap_or((0, 0));
        (self.cursor_set, self.cursor_x, self.cursor_y) = (point.is_some() as u32, x, y);
    }

    /// The set point in physical screen pixels; none while unset, as off the input desktop.
    pub fn cursor(&self) -> Option<(i32, i32)> {
        (self.cursor_set != 0).then_some((self.cursor_x, self.cursor_y))
    }

    pub fn set_button(&mut self, button: Button, down: bool) {
        match down {
            true => self.buttons |= button.bit(),
            false => self.buttons &= !button.bit(),
        }
    }

    /// A window coming to the front is newer input than anything floawty sent before.
    pub fn set_foreground(&mut self, foreground: Foreground) {
        self.foreground = foreground as u32;
        self.input_sent = 0;
    }

    pub fn foreground(&self) -> Foreground {
        Foreground::from_raw(self.foreground)
    }

    /// floawty sent input: Windows then lets its next `SetForegroundWindow` through.
    pub fn note_send_input(&mut self) {
        self.input_sent = 1;
    }

    /// What `GetAsyncKeyState` answers for a mouse button; any other key is not ours to answer.
    pub fn async_key(&self, vk: i32) -> Option<i16> {
        let button = Button::from_vk(vk)?;
        Some(if self.buttons & button.bit() != 0 {
            KEY_DOWN
        } else {
            0
        })
    }

    /// Answers `SetForegroundWindow` for a floawty window (`None`: it is not one): floawty keeps
    /// the foreground it has, and otherwise only input it just sent wins it back, once.
    pub fn request_foreground(&mut self, target: Option<Foreground>) -> bool {
        let Some(target) = target.filter(|target| target.is_floawty()) else {
            return false;
        };
        let granted = match (self.foreground().is_floawty(), self.input_sent != 0) {
            (true, _) => true,
            (false, sent) => {
                self.input_sent = 0;
                sent
            }
        };
        if granted {
            self.set_foreground(target);
        }
        granted
    }
}

/// Whether `GetAsyncKeyState` of this key code is answered from the test's buttons.
pub fn is_button_key(vk: i32) -> bool {
    Button::from_vk(vk).is_some()
}

/// Which floawty window a root window is, if any.
pub fn target_of(windows: &Windows, root: u64) -> Option<Foreground> {
    match Some(root) {
        found if found == windows.main => Some(Foreground::Main),
        found if found == windows.sign_in => Some(Foreground::SignIn),
        _ => None,
    }
}

/// The window `GetForegroundWindow` names and `GetGUIThreadInfo` reports active and focused;
/// none when nothing is in front or the named window of floawty is not there.
pub fn front_window(foreground: Foreground, find: &dyn Fn() -> Windows, other: u64) -> Option<u64> {
    match foreground {
        Foreground::Main => find().main,
        Foreground::SignIn => find().sign_in,
        Foreground::Other => Some(other),
        Foreground::None => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const OTHER: u64 = 0x99;

    fn windows(main: Option<u64>, sign_in: Option<u64>) -> Windows {
        Windows { main, sign_in }
    }

    fn front(foreground: Foreground, found: Windows) -> Option<u64> {
        front_window(foreground, &|| found, OTHER)
    }

    fn input_in(foreground: Foreground) -> Input {
        let mut input = Input::default();
        input.set_foreground(foreground);
        input
    }

    #[test]
    fn a_fresh_state_has_no_cursor_buttons_up_and_floawty_in_front() {
        let input = Input::default();
        assert_eq!(input.cursor(), None);
        assert_eq!(input.async_key(VK_LBUTTON), Some(0));
        assert_eq!(input.async_key(VK_RBUTTON), Some(0));
        assert_eq!(input.foreground(), Foreground::Main);
    }

    #[test]
    fn a_set_cursor_is_answered_even_at_a_negative_point_and_can_be_unset() {
        let mut input = Input::default();
        input.set_cursor(Some((-1920, 12)));
        assert_eq!(input.cursor(), Some((-1920, 12)));
        input.set_cursor(Some((0, 0)));
        assert_eq!(input.cursor(), Some((0, 0)));
        input.set_cursor(None);
        assert_eq!(input.cursor(), None);
    }

    #[test]
    fn each_button_sets_the_top_bit_while_it_is_down() {
        let mut input = Input::default();
        input.set_button(Button::Left, true);
        assert_eq!(input.async_key(VK_LBUTTON), Some(i16::MIN));
        assert_eq!(input.async_key(VK_RBUTTON), Some(0));
        input.set_button(Button::Right, true);
        input.set_button(Button::Left, false);
        assert_eq!(input.async_key(VK_LBUTTON), Some(0));
        assert_eq!(input.async_key(VK_RBUTTON), Some(i16::MIN));
    }

    #[test]
    fn every_other_key_is_left_to_windows() {
        assert_eq!(Input::default().async_key(0x41), None);
        assert_eq!(Input::default().async_key(0x04), None);
        assert!(is_button_key(VK_LBUTTON) && is_button_key(VK_RBUTTON));
        assert!(!is_button_key(0x41));
    }

    #[test]
    fn the_foreground_names_parse_and_unknown_ones_do_not() {
        assert_eq!(Foreground::parse("main"), Some(Foreground::Main));
        assert_eq!(Foreground::parse("sign-in"), Some(Foreground::SignIn));
        assert_eq!(Foreground::parse("other"), Some(Foreground::Other));
        assert_eq!(Foreground::parse("none"), Some(Foreground::None));
        assert_eq!(Foreground::parse("bar"), None);
    }

    #[test]
    fn the_foreground_named_is_the_window_in_front() {
        let both = windows(Some(1), Some(2));
        assert_eq!(front(Foreground::Main, both), Some(1));
        assert_eq!(front(Foreground::SignIn, both), Some(2));
        assert_eq!(front(Foreground::Other, both), Some(OTHER));
        assert_eq!(front(Foreground::None, both), None);
    }

    #[test]
    fn a_named_floawty_window_that_is_gone_leaves_nothing_in_front() {
        assert_eq!(front(Foreground::Main, windows(None, Some(2))), None);
        assert_eq!(front(Foreground::SignIn, windows(Some(1), None)), None);
    }

    #[test]
    fn the_windows_are_only_looked_up_for_floawty_states() {
        let must_not_look = || -> Windows { panic!("looked up the windows") };
        assert_eq!(
            front_window(Foreground::Other, &must_not_look, OTHER),
            Some(OTHER)
        );
        assert_eq!(front_window(Foreground::None, &must_not_look, OTHER), None);
    }

    #[test]
    fn a_root_window_is_main_sign_in_or_not_floawtys() {
        let found = windows(Some(1), Some(2));
        assert_eq!(target_of(&found, 1), Some(Foreground::Main));
        assert_eq!(target_of(&found, 2), Some(Foreground::SignIn));
        assert_eq!(target_of(&found, 3), None);
        assert_eq!(target_of(&windows(None, None), 0), None);
    }

    #[test]
    fn floawty_in_front_may_bring_either_of_its_windows_forward() {
        let mut input = input_in(Foreground::Main);
        assert!(input.request_foreground(Some(Foreground::SignIn)));
        assert_eq!(input.foreground(), Foreground::SignIn);
        assert!(input.request_foreground(Some(Foreground::Main)));
        assert_eq!(input.foreground(), Foreground::Main);
    }

    #[test]
    fn another_window_in_front_refuses_floawty_and_keeps_the_state() {
        for foreground in [Foreground::Other, Foreground::None] {
            let mut input = input_in(foreground);
            assert!(!input.request_foreground(Some(Foreground::Main)));
            assert_eq!(input.foreground(), foreground);
        }
    }

    #[test]
    fn input_floawty_just_sent_wins_the_foreground_back_once() {
        let mut input = input_in(Foreground::Other);
        input.note_send_input();
        assert!(input.request_foreground(Some(Foreground::Main)));
        assert_eq!(input.foreground(), Foreground::Main);
        input.set_foreground(Foreground::Other);
        assert!(!input.request_foreground(Some(Foreground::Main)));
    }

    #[test]
    fn a_window_that_is_not_floawtys_is_never_granted() {
        let mut input = input_in(Foreground::Main);
        input.note_send_input();
        assert!(!input.request_foreground(None));
        assert!(!input.request_foreground(Some(Foreground::Other)));
        assert_eq!(input.foreground(), Foreground::Main);
    }

    #[test]
    fn input_sent_before_another_window_came_to_front_wins_nothing() {
        let mut input = input_in(Foreground::Main);
        input.note_send_input();
        input.set_foreground(Foreground::Other);
        assert!(!input.request_foreground(Some(Foreground::Main)));
        assert_eq!(input.foreground(), Foreground::Other);
    }

    #[test]
    fn a_refusal_does_not_spend_the_input_floawty_sent_for_another_window() {
        let mut input = input_in(Foreground::Other);
        input.note_send_input();
        assert!(!input.request_foreground(None));
        assert!(input.request_foreground(Some(Foreground::Main)));
    }
}
