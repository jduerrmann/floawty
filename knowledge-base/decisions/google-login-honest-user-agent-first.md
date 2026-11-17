---
type: decision
area: services
tags: [youtube, login, user-agent]
status: active
created: 2026-11-17
updated: 2026-11-17
source: conversation (visual plan "floawty – Projektplanung", rounds 1–2)
---

# Google login must work; floawty identifies honestly first

## Context

Signing in to YouTube is required (subscriptions, own recommendations, Shorts feed).
Google often blocks sign-in from embedded browsers, which it detects partly through
the user agent (Electron adds "Electron" to it).

## Decision

- A working Google sign-in is a must for the stack decision.
- The spike first tests with the honest default user agent (or one naming floawty).
- Only if Google blocks that, floawty reports the user agent of the bundled Chromium
  version as plain Chrome – it is Chromium, nothing else is changed or circumvented.

## Alternatives

- Always report as Chrome – deferred: only if the honest variant fails.
- Never change the user agent – rejected if it makes sign-in impossible.
- Sign-in in the system browser with session transfer – rejected: would require
  reading or moving cookies, which [[core-principles]] #7 forbids.

## Consequences

- The spike records which variant works, per stack.
- If even the Chrome user agent is blocked, the stack decision is reopened.
