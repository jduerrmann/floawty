# Privacy

Short version: **floawty collects nothing.**

- No telemetry, analytics, crash reporting or unique IDs.
- No floawty account and no floawty server – there is nothing to send data to.
- Your logins happen on the official websites (YouTube, Netflix, …) inside the
  overlay. Their cookies are stored locally on your computer, like in a normal
  browser. floawty's code never reads them.
- Settings are stored locally in a plain JSON file in your user-data folder.
- floawty makes no network requests on its own. It checks GitHub Releases for
  updates only when you click "Check for updates" or turn on automatic checks
  (off by default).
- Netflix, Prime Video and Disney+ need Google's Widevine module to play protected
  video. The first time you open one of them, floawty tells you that it will download
  this module from a Google server and only does so after you agree. YouTube, Twitch
  and custom URLs never need it.
- "Reset all data" in the settings deletes your settings and all stored sessions.

The streaming services you open have their own privacy policies, exactly as when
you use them in a browser.
