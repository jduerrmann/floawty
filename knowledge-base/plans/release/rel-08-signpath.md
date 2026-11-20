---
type: plan
tags: [package, release, dist]
status: planned
created: 2026-11-20
updated: 2026-11-20
source: visual plan "Phase 3 – Release-Pipeline", approved 2026-11-20
---

# rel-08 – Releases are signed through SignPath Foundation

Plan: [[plan-release]]

## Outcome
After 0.1.0 the maintainer applies to SignPath Foundation; once accepted, the release
workflow signs the exe files and the installer, and the README drops the warning.

## Scope
- Owns: a code signing policy page, the signing step in `release.yml` (before the
  updater signature), README and the consequences in [[unsigned-first-then-signpath]].
- Non-goals: buying a certificate; Azure Artifact Signing (individuals only in the US
  and Canada, checked 2026-11-20).
- Read first: [[unsigned-first-then-signpath]], signpath.org terms and application.

## Acceptance criteria
- [ ] Code signing policy published in the repository with SignPath's attribution
      line; its privacy statement squares with the disclosed WebView2 diagnostics and
      the update check.
- [ ] Application sent by the maintainer (MFA on GitHub and SignPath for everyone
      with write access).
- [ ] After acceptance: the next release is signed with "SignPath Foundation" as
      publisher; the updater files still verify.

## Resume here
Not started; waits for 0.1.0. SignPath's review time is unknown.
