//! Pure decisions of the sign-in window: which pop-up opens, where it may go, its title and place.
use url::Url;

use crate::geometry::{self, Rect};
use crate::navigation;

/// A pop-up the service page asks for, with what floawty knows at that moment.
pub struct Request<'a> {
    pub url: &'a Url,
    pub sign_in_hosts: &'a [String],
    /// A sign-in window is open or being built.
    pub busy: bool,
    /// floawty's main window is visible and in the foreground.
    pub foreground: bool,
}

/// Only an https sign-in page of a listed host opens, one at a time, while floawty is in front.
pub fn may_open(request: &Request) -> bool {
    !request.busy && request.foreground && listed(request.url, request.sign_in_hosts)
}

/// The window stays on the sign-in hosts and the service's own domains; everything else is cancelled.
pub fn stays(url: &Url, sign_in_hosts: &[String], allowed_domains: &[String]) -> bool {
    listed(url, sign_in_hosts)
        || matches!(
            navigation::decide(url, allowed_domains),
            navigation::Decision::Stay
        )
}

// Exact hosts: a sign-in host names one page, not a domain with its subdomains.
fn listed(url: &Url, sign_in_hosts: &[String]) -> bool {
    url.scheme() == "https"
        && url
            .host_str()
            .is_some_and(|host| sign_in_hosts.iter().any(|listed| listed == host))
}

/// The provider's host tells the user where they type.
pub fn title(url: &Url) -> String {
    format!("floawty – {}", url.host_str().unwrap_or_default())
}

/// Centred over floawty, kept inside the work area of floawty's monitor.
pub fn placement(owner: Rect, work_area: Rect, size: (u32, u32)) -> Rect {
    let (width, height) = size;
    let centred = Rect {
        x: owner.x + (owner.width as i32 - width as i32) / 2,
        y: owner.y + (owner.height as i32 - height as i32) / 2,
        width,
        height,
    };
    geometry::shift_inside(centred, work_area)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn hosts() -> Vec<String> {
        vec!["accounts.google.com".into(), "www.facebook.com".into()]
    }

    fn url(text: &str) -> Url {
        Url::parse(text).unwrap()
    }

    fn opens(text: &str, busy: bool, foreground: bool) -> bool {
        let url = url(text);
        let hosts = hosts();
        may_open(&Request {
            url: &url,
            sign_in_hosts: &hosts,
            busy,
            foreground,
        })
    }

    #[test]
    fn opens_an_https_page_of_a_listed_host() {
        assert!(opens(
            "https://accounts.google.com/o/oauth2/auth?x=1",
            false,
            true
        ));
        assert!(opens("https://www.facebook.com/login.php", false, true));
    }

    #[test]
    fn denies_other_hosts_look_alikes_and_plain_http() {
        assert!(!opens("https://ads.example.org/", false, true));
        assert!(!opens("https://evil.accounts.google.com/", false, true));
        assert!(!opens("https://accounts.google.com.evil.org/", false, true));
        assert!(!opens("http://accounts.google.com/", false, true));
        assert!(!opens("about:blank", false, true));
    }

    #[test]
    fn denies_a_second_window_and_a_request_from_the_background() {
        assert!(!opens("https://accounts.google.com/", true, true));
        assert!(!opens("https://accounts.google.com/", false, false));
    }

    #[test]
    fn a_service_without_sign_in_hosts_opens_nothing() {
        let url = url("https://accounts.google.com/");
        assert!(!may_open(&Request {
            url: &url,
            sign_in_hosts: &[],
            busy: false,
            foreground: true
        }));
    }

    #[test]
    fn stays_on_sign_in_hosts_the_service_and_its_own_start() {
        let domains = vec!["tiktok.com".to_string()];
        assert!(stays(
            &url("https://accounts.google.com/signin/v2"),
            &hosts(),
            &domains
        ));
        assert!(stays(
            &url("https://www.tiktok.com/login/callback"),
            &hosts(),
            &domains
        ));
        assert!(stays(&url("about:blank"), &hosts(), &domains));
    }

    #[test]
    fn cancels_every_other_page() {
        let domains = vec!["tiktok.com".to_string()];
        assert!(!stays(&url("https://example.org/help"), &hosts(), &domains));
        assert!(!stays(
            &url("https://myaccount.google.com/"),
            &hosts(),
            &domains
        ));
        assert!(!stays(
            &url("http://accounts.google.com/"),
            &hosts(),
            &domains
        ));
        assert!(!stays(&url("mailto:help@example.org"), &hosts(), &domains));
    }

    #[test]
    fn the_title_names_the_host_only() {
        assert_eq!(
            title(&url(
                "https://accounts.google.com/o/oauth2?client_id=secret"
            )),
            "floawty – accounts.google.com"
        );
    }

    #[test]
    fn sits_centred_over_floawty() {
        let owner = Rect {
            x: 1000,
            y: 500,
            width: 480,
            height: 270,
        };
        let area = Rect {
            x: 0,
            y: 0,
            width: 2560,
            height: 1400,
        };
        let rect = placement(owner, area, (480, 640));
        assert_eq!(
            rect,
            Rect {
                x: 1000,
                y: 315,
                width: 480,
                height: 640
            }
        );
    }

    #[test]
    fn stays_inside_floawty_s_monitor_near_its_edges() {
        let owner = Rect {
            x: 2200,
            y: 1200,
            width: 360,
            height: 200,
        };
        let area = Rect {
            x: 0,
            y: 0,
            width: 2560,
            height: 1400,
        };
        assert_eq!(
            placement(owner, area, (480, 640)),
            Rect {
                x: 2080,
                y: 760,
                width: 480,
                height: 640
            }
        );
        let left = Rect {
            x: -1920,
            y: 0,
            width: 1920,
            height: 1040,
        };
        let on_left = Rect {
            x: -1900,
            y: 20,
            width: 300,
            height: 170,
        };
        assert_eq!(
            placement(on_left, left, (480, 640)),
            Rect {
                x: -1920,
                y: 0,
                width: 480,
                height: 640
            }
        );
    }
}
