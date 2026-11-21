# Changelog

User-facing changes, in plain language. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

- New look for the start screen: tiles of coloured glass, light or dark like Windows,
  with names that stay easy to read; the notice and the add-page form match.
- Small window that stays on top: bottom right at first, snaps to corners and edges,
  remembers where it was.
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
- The overlay can take any shape; near 16:9 or cinema scope (2.40) it snaps onto it.
- Zoom (⤢ in the bar or Ctrl+Alt+Shift+Z, off at first): in an overlay wider than
  16:9 the video fills the width, so films with bars in the picture show without them;
  only top and bottom are cut.
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
- A TikTok tile opens the For You feed upright with the auto mode on: each video – and
  each ad – plays once in full, rests for the chosen pause, then TikTok's own "next"
  button moves on. A photo slideshow moves on once all its pictures were shown (or its
  music has played, if that is sooner); a LIVE stays.
  The ▶ button is called "Auto mode", its settings "Shorts and TikTok".
  Without a TikTok account, TikTok shows its sign-in prompt every few videos and the
  feed waits until you deal with it; floawty leaves the prompt alone.
- "Continue with Google / Apple / Facebook" on TikTok opens the provider's page in a small
  floawty window (titled with the provider's address); after the sign-in TikTok is signed
  in and the window closes. Other pop-ups stay blocked.
- Ctrl+Alt+Shift+Space pauses whatever plays, also a slideshow's music, or plays the
  video in the middle of the window (or the page's only video), so on TikTok it never
  starts a neighbouring video. Hiding floawty also pauses a slideshow's music.
- With "video only" on, YouTube Shorts show just the video, and the mouse wheel or a
  swipe moves to the next or previous Short with YouTube's own animation. YouTube's own
  seek bar runs along the bottom; with the mouse over the video, its play button, volume
  control (the slider opens over the speaker) and ⋮ menu appear right above it.
- With "video only" on, TikTok shows just the video on its feeds and video pages, and the
  mouse wheel moves to the next or previous video as on TikTok. TikTok's progress bar runs
  along the bottom, its volume control sits low on the left; videos of another shape show
  whole, with bars; TikTok's small labels stay on
  the video. Video pages (`/@…/video/…`) now count as TikTok's feed too: upright and with
  the auto mode.
- Settings: "Use graphics acceleration" (on at first). Turning it off makes floawty
  restart without the graphics card, like the same switch in Edge; it needs more CPU,
  and services with copy protection may play in lower quality.
- "Always on top" can be switched off (🖈 in the bar or Ctrl+Alt+Shift+T), so other
  windows can cover floawty; floawty remembers the choice. Click-through keeps floawty
  on top while it is on. While floawty is not kept on top, Ctrl+Alt+Shift+O first brings
  it to the front (also when minimized), a second press hides it.
