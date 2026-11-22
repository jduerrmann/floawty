# floawty

**Watch videos in a small, always-on-top overlay – while you do something else.**

floawty is a free, open-source desktop app that shows YouTube, Netflix, Prime Video
and other streaming services in a floating window. You choose how big it is, how
transparent it is and where on the screen it sits. It stays on top of everything
else, and can even let your mouse click right through it.

> **Status:** planning the first version (Tauri, Windows). There is no download yet.
> See the [phases in the overview](knowledge-base/overview.md#phases).

## Planned features

- Floating overlay, always on top
- Adjustable size, opacity and position (snap to corners, multi-monitor)
- Click-through mode – the overlay stays visible, your clicks go to the app behind it
- Global hotkeys (show/hide, opacity, click-through, play/pause)
- Services: YouTube, TikTok, Netflix, Prime Video, Disney+, Twitch, RTL+, Crunchyroll,
  Apple TV, or any custom URL
- **Auto mode for YouTube Shorts and TikTok** – automatically moves on to the next video
- English and German interface

## Promises

- **Free forever**, licensed under GPL-3.0
- **No ads**, no affiliate links, no sponsored anything
- **No server, no account, no tracking.** floawty only talks to the streaming sites
  you open, and to GitHub only when you ask it to check for updates. Honest
  footnote: floawty uses Windows' WebView2 component, which sends diagnostic data to
  Microsoft, which cannot be stopped, and loads updates of its own parts (such as the
  video DRM module) from Microsoft, which floawty keeps on because some services need
  that module. floawty tells you at the first start. See [PRIVACY.md](PRIVACY.md).
- **Light on resources.** Made to run next to your work on an ordinary PC: a 4 MB
  download, about 250 MB of memory when idle.
- **Fair to the services.** You sign in on the official websites; floawty does not
  touch DRM, does not download content and does not block ads. "Continue with
  Google / Apple / Facebook" opens the provider's own page in a small window; that
  sign-in stays in floawty until "Reset all data".

## Install

Once released: download the latest version from the
[Releases](../../releases) page – portable build or installer, no admin rights needed.
Windows 10 and 11 only for now.

## Contributing

Contributions are welcome – especially fixes when a streaming site changes its
layout. Read [CONTRIBUTING.md](CONTRIBUTING.md) and the project rules in
[AGENTS.md](AGENTS.md) first.

## License

[GPL-3.0](LICENSE). floawty is not affiliated with YouTube, Netflix, Amazon, Disney,
Twitch or any other service it can display. All trademarks belong to their owners.

The service logos on the tiles (`src/assets/logos/`) are the one exception to the
GPL: they are trademarks of their owners, redrawn only to name each service, and
not licensed under GPL-3.0. See [the logo notice](src/assets/logos/NOTICE.md).
