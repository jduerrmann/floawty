//! Keeps a service webview on its own domains; everything else opens in the browser.
use url::Url;

pub enum Decision {
    Stay,
    OpenInBrowser,
}

/// Page-internal schemes stay; web pages stay only on an allowed domain.
pub fn decide(url: &Url, allowed_domains: &[String]) -> Decision {
    match url.scheme() {
        "about" | "blob" | "data" => Decision::Stay,
        "http" | "https" if host_allowed(url.host_str(), allowed_domains) => Decision::Stay,
        _ => Decision::OpenInBrowser,
    }
}

fn host_allowed(host: Option<&str>, allowed_domains: &[String]) -> bool {
    let Some(host) = host else { return false };
    allowed_domains
        .iter()
        .any(|domain| host == domain || host.ends_with(&format!(".{domain}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn domains() -> Vec<String> {
        vec!["netflix.com".into(), "google.com".into()]
    }

    fn stays(url: &str) -> bool {
        matches!(
            decide(&Url::parse(url).unwrap(), &domains()),
            Decision::Stay
        )
    }

    #[test]
    fn stays_on_allowed_domains_and_subdomains() {
        assert!(stays("https://www.netflix.com/browse"));
        assert!(stays("https://accounts.google.com/signin"));
    }

    #[test]
    fn sends_other_sites_to_the_browser() {
        assert!(!stays("https://example.org/"));
        assert!(!stays("https://evilnetflix.com/"));
        assert!(!stays("https://netflix.com.evil.org/"));
    }

    #[test]
    fn keeps_page_internal_schemes() {
        assert!(stays("about:blank"));
        assert!(stays("blob:https://www.netflix.com/1234"));
        assert!(stays("data:text/html,hi"));
    }

    #[test]
    fn sends_other_schemes_to_the_browser() {
        assert!(!stays("mailto:someone@example.org"));
        assert!(!stays("file:///C:/secret.txt"));
    }
}
