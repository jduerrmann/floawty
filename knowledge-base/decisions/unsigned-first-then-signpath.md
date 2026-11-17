---
type: decision
area: dist
tags: [code-signing, release, windows]
status: active
created: 2026-11-17
updated: 2026-11-17
source: conversation (visual plan "floawty – Projektplanung", round 2)
---

# Releases start unsigned, then move to free OSS signing

## Context

Windows SmartScreen warns about unsigned programs from unknown publishers, and many
users stop there. A purchased certificate costs money every year.

## Decision

- First releases are unsigned; the README explains the SmartScreen warning and how to
  check the download (SHA-256 checksums on the release page).
- As soon as the public repository qualifies, apply to the SignPath Foundation for
  free open-source code signing and sign every release from then on.

## Alternatives

- Buy a certificate – rejected: recurring cost without a sponsor.
- Stay unsigned forever – rejected: the warning scares off users permanently.

## Consequences

- The release pipeline publishes checksums from the start and gets a signing step
  later.
