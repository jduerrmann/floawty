# Changelog

User-facing changes, in plain language. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

- Small window that stays on top: bottom right at first, snaps to corners and edges,
  keeps 16:9, remembers where it was.
- Adjustable transparency, click-through with a dot in the corner, hide/show – all
  with hotkeys (Ctrl+Alt+Shift + ↑/↓, D, O).
- Window mode: a normal window for signing in and browsing (Ctrl+Alt+Shift+F).
- Tiles for YouTube, Twitch, Netflix, Prime Video, Disney+ and RTL+, plus your own
  pages; floawty reopens the last service on start.
- Hiding pauses the video; Ctrl+Alt+Shift+Space plays and pauses.
- A one-time notice explains that Windows' WebView2 sends diagnostic data to Microsoft
  and loads updates of its own parts, such as the DRM module, from Microsoft.
- A bar appears over the video when you rest the mouse on floawty: back to the
  services, transparency, click-through, Shorts auto mode, window mode, settings and
  close. Drag the window by the bar.
- Settings inside floawty (the video pauses meanwhile): language, your own hotkeys
  (press the new keys, conflicts are shown), pause between Shorts, update check (off,
  not available yet) and "Reset all data".
- English and German everywhere; German shows hotkeys as Strg+Alt+Umschalt.
- The click-through dot is now visible over a service too.
- Window mode shows the bar above the page, so buttons at the top of a site (like
  "Log in") can be clicked; over a video the bar is only as wide as its buttons.
- Service tiles: four per row, growing with the window; new tiles for Crunchyroll (with
  "video only") and Apple TV.
- RTL+: "Sign in with Amazon" stays inside floawty.
- Netflix shows no page scrollbar while a title plays.
- Dragging only the top or bottom edge of the overlay keeps the new height.
- The overlay snaps right into corners and onto edges, without a gap.
- "Video only" on YouTube also works in a large overlay, where YouTube uses a wider layout.
- YouTube Shorts auto mode (▶ in the bar): each Short – and each ad between them –
  plays once in full, rests on its first frame for the chosen pause, then YouTube's
  own "next" button moves on. The mouse over floawty holds it (can be turned off).
- While Shorts play, the overlay turns upright (9:16) and turns back afterwards; in the
  settings choose "same size, turned" or "its own size" for the upright overlay.
- A "YouTube Shorts" tile opens the Shorts feed directly with the auto mode on.
- If YouTube changes its page so the auto mode cannot work, Shorts simply loop as
  before and an amber dot on ▶ says so.
- "Video only" (▣ in the bar or Ctrl+Alt+Shift+V): on YouTube, YouTube Shorts and
  Twitch the video fills the overlay, the rest of the page is hidden beneath it. It
  stays on until you switch it off; window mode always shows the whole page.
