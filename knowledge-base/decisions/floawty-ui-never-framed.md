---
type: decision
area: services
tags: [security, ipc, csp, capabilities]
status: active
created: 2026-11-21
updated: 2026-11-21
source: advisor finding in the sf-04 design check; probe runs and advisor review 2026-11-21
---

# floawty's own pages refuse to load in a frame

## Context
The advisor suspected an IPC gap: a service page could embed `http://tauri.localhost/`
in an iframe. Tauri 2.12 checks floawty's 22 app commands from a local origin against
the ACL only when the app has an app manifest (floawty has none; plugin commands stay
bound to `main` and `bar`). Frames never reach the navigation guard, the `tauri`
protocol serves every frame, and wry adds Tauri's scripts (with the invoke key) to
subframes on Windows. Probe of 2026-11-21 (release build, fixture page on a routed
`example.com`): floawty's home page **did load** in the frame with
`__TAURI_INTERNALS__`, but `tiles_state` got no answer and `accept_notice` changed
nothing. Two barriers held, both by accident: floawty's CSP has no `connect-src` for
`http://ipc.localhost`, so the IPC fetch is blocked; Tauri's fallback
`window.ipc.postMessage` from a subframe goes unanswered (wry listens only to the
top-level `WebMessageReceived`; WebView2 runtime behavior, not Tauri's contract).
Adding Tauri's usual `connect-src ipc: http://ipc.localhost` would have opened every
app command to a framed floawty page.

## Decision
- The CSP of floawty's own pages contains `frame-ancestors 'none'`. Tauri sends it as
  a header with every HTML asset (home, `bar.html`, the fallback for unknown paths),
  so no page can frame them.
- `tests/framed-ui.spec.ts` pins it: the header on `/`, `/bar.html` and an unknown
  path, and a framing service page that gets no floawty page and whose
  `accept_notice` changes nothing. Red on the old CSP, green on the new one.
- Never add `http://ipc.localhost` or `ipc:` to `connect-src` without an app manifest
  that binds commands to the `main` and `bar` webviews.
- Never ship a non-HTML document with script (e.g. a scripted SVG): such assets get
  no CSP and stay frameable on floawty's origin.

## Alternatives
- Only the test and this note – leaves the safety to two accidental barriers.
- App manifest in `build.rs` (`AppManifest::commands`), so every app command needs a
  permission and only the `main` capability grants them – strongest and label-bound,
  but 22 commands to list in `build.rs` and the capability. Not needed while no
  non-UI webview can show a top-level floawty page (below).

## Consequences
- Known gap, accepted by the maintainer: `frame-ancestors` does not cover top-level
  pages. A custom tile `http://tauri.localhost/` shows floawty's home page in the
  service webview with every app command working. Harmless today: floawty's own code,
  started only by the user.
- sf-04 (sign-in window) is the trigger for the app manifest: if a second non-UI
  webview can show a top-level `tauri.localhost` page or allows new windows, add it.
- Dev builds (`npm run dev`) are not covered: Vite serves the UI without this CSP and
  Tauri treats the devUrl as local.
- Security baseline: [[engineering-standards]] §8, [[tech-services]].
