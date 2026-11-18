# Privacy

Short version: **floawty collects nothing.** Two things come from Windows'
WebView2 component, not from floawty: it sends diagnostic data to Microsoft and loads
updates of its own parts from Microsoft (see below).

- No telemetry, analytics, crash reporting or unique IDs.
- No floawty account and no floawty server – there is nothing to send data to.
- Your logins happen on the official websites (YouTube, Netflix, …) inside the
  overlay. Their cookies are stored locally on your computer, like in a normal
  browser. floawty's code never reads them.
- Settings are stored locally in a plain JSON file in your user-data folder.
- floawty makes no network requests on its own. It checks GitHub Releases for
  updates only when you click "Check for updates" or turn on automatic checks
  (off by default).
- floawty shows the services through **Microsoft Edge WebView2**, a component of
  Windows that many apps use. WebView2 sends diagnostic data to Microsoft – Microsoft
  says it always sends required diagnostic data, whatever the settings. floawty
  switches off WebView2's optional background services, but cannot stop this
  connection. WebView2 also asks Microsoft (`edge.microsoft.com`) for updates of its
  built-in parts, such as the DRM module, and downloads them from Microsoft's download
  servers; switching that off
  would remove the DRM module some services need. floawty tells you about both at
  the first start. Microsoft's description:
  [WebView2 data and privacy](https://learn.microsoft.com/microsoft-edge/webview2/concepts/data-privacy).
- Protected video (Netflix, Prime Video, Disney+, …) uses the DRM modules of
  WebView2, which WebView2 keeps up to date itself; floawty downloads nothing for it.
- "Reset all data" in the settings deletes your settings, your own tiles, the local
  log and all stored logins, then restarts floawty.

The streaming services you open have their own privacy policies, exactly as when
you use them in a browser.
