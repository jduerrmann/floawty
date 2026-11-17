---
type: decision
area: ui
tags: [bar, hover, resources, win32]
status: active
created: 2026-11-17
updated: 2026-11-17
source: mvp-05 implementation
---

# The bar notices hovering by looking at the cursor ten times a second

## Context

The bar shows after 300 ms over the video ([[mvp-scope-and-controls]]). The service
page runs in WebView2's own processes: its mouse moves never reach floawty's
windows, and service pages get no IPC ([[tech-services]]). Engineering standards §7
asks for event-driven code and allows polling only where it is unavoidable.

## Decision

While a service is visible and clickable, a background thread looks at the cursor
every 100 ms with plain Win32 calls (`GetCursorPos`, `WindowFromPoint`,
`GetAncestor`, `IsChild`). It parks whenever the window is hidden, no service is
open, the settings are open or click-through is on. Measured: floawty.exe stays at
0.000 % CPU with a service open and the cursor elsewhere.

## Alternatives

- A thin hover zone at the top that is always there – rejected: the bar would only
  appear at the top edge, and the strip would always swallow clicks on the video.
- A low-level mouse hook or raw input – rejected: every mouse move of the whole
  system would wake floawty, and a global hook looks like spyware.
- A page script in the service reporting mouse moves – rejected: service pages get
  no IPC, and floawty does not change the services' pages for its own UI.
- Tauri's window queries in the loop – rejected after measuring 0.94 % CPU: each
  one waits for the main thread.

## Consequences

- The thread does not stop while a video is paused: floawty cannot tell, and the
  bar is needed most then. Its cost is within "idle ≈ 0 %".
- Tests move the real cursor (`tests/desktop.ts`).
