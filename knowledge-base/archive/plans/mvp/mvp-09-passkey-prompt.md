---
type: plan
tags: [package, mvp, services, sign-in]
status: done
created: 2026-11-18
updated: 2026-11-18
source: mvp-08 service checks, maintainer 2026-11-18
---

# mvp-09 – Prime Video's passkey prompt no longer interrupts the password

Plan: [[plan-mvp]]

## Outcome
Typing the password on Amazon's sign-in page in floawty no longer pops up the Windows
passkey dialog by itself, or the maintainer decides it stays.

## Scope
- Owns: findings in [[mvp-measurements]] or a new research note; a fix only if it
  needs no change to Amazon's page (e.g. a WebView2 switch or setting).
- Non-goals: reading, filling or storing credentials (core principle 7); turning off
  passkeys the user wants.
- Read first: [[tech-services]], [[webview2-component-updates-disclosed]] (browser
  arguments are shared by every webview).

## Acceptance criteria
- [x] Cause found: which request (`navigator.credentials.get`, conditional mediation)
      makes WebView2 show the Windows dialog, and whether Edge behaves the same.
- [x] Options with tradeoffs to the maintainer; chosen: leave it (nothing to build).
- [x] Passkey sign-in still possible where the user wants it (unchanged).

## Tests first
- Depends on the option: a browser argument gets a check that WebView2 starts with it.

## Checks
- Live with the maintainer's Amazon account; `npm run verify`.

## Resume here
Not started. Found in the mvp-08 checks: the dialog opens whenever the password field
gets focus on Prime Video's sign-in.
