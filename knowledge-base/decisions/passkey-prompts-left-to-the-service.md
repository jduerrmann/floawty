---
type: decision
area: services
tags: [sign-in, passkeys, webauthn]
status: active
created: 2026-11-18
updated: 2026-11-18
source: mvp-09, maintainer 2026-11-18
---

# Passkey prompts are left to the service

## Context

On Prime Video's sign-in the Windows passkey dialog ("Windows-Sicherheit") opened at the
password step. A local test page showed: a conditional request (`mediation:
'conditional'`, passkeys offered in the field's suggestion list) opens no dialog in
WebView2; a direct `navigator.credentials.get` opens it at once. Amazon makes a direct
request; Edge shows the same dialog (maintainer, 2026-11-18).

## Decision

floawty leaves passkey requests alone: no switch against WebAuthn, no page script that
touches a sign-in. Cancelling the dialog leads to the password; users who do not want
it remove the passkey or the passkey sign-in in their Amazon account.

## Alternatives

- Turning WebAuthn off for all webviews – rejected: no passkey sign-in for any service.
- Suppressing Amazon's request with a page script – rejected: it changes a service's
  sign-in, against [[core-principles]] #7.

## Consequences

floawty behaves like the user's browser on every sign-in ([[tech-services]]).
