//! Which `PostMessageW` calls of floawty are swallowed: the ones that start Windows' move loop.

const WM_NCLBUTTONDOWN: u32 = 0x00A1;
const HTCAPTION: usize = 2;

/// A press on the caption: tao posts it to make Windows run its modal move loop.
pub fn is_drag_request(message: u32, wparam: usize) -> bool {
    message == WM_NCLBUTTONDOWN && wparam == HTCAPTION
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_press_on_the_caption_is_a_drag_request() {
        assert!(is_drag_request(WM_NCLBUTTONDOWN, HTCAPTION));
    }

    #[test]
    fn a_press_on_a_border_is_not_one() {
        // HTLEFT, HTTOPLEFT, HTBOTTOMRIGHT: tao's drag_resize_window.
        for hit in [10, 13, 17] {
            assert!(!is_drag_request(WM_NCLBUTTONDOWN, hit), "{hit}");
        }
    }

    #[test]
    fn other_messages_with_the_same_wparam_are_not_drag_requests() {
        // WM_NCLBUTTONUP, WM_LBUTTONDOWN, WM_USER, WM_HOTKEY.
        for message in [0x00A2, 0x0201, 0x0400, 0x0312] {
            assert!(!is_drag_request(message, HTCAPTION), "{message:#x}");
        }
    }
}
