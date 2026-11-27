---
type: plan
tags: [package, release, dist]
status: planned
created: 2026-11-20
updated: 2026-11-27
source: visual plan "Phase 3 – Release-Pipeline", approved 2026-11-20; advisor review
---

# rel-07 – floawty 0.1.0 is public

Plan: [[plan-release]]

## Outcome
After release candidates proved install and update, 0.1.0 is published from a tag,
and README, CHANGELOG and the notes describe the released state.

## Scope
- Owns: README (status, download, SmartScreen warning, checksums, measured size),
  CHANGELOG `[0.1.0]`, the phases table in [[overview]], a release measurement in
  [[mvp-measurements]], the minimum tested WebView2 version ([[stack-by-spike]]
  "Risk: Microsoft updates WebView2").
- Non-goals: signing (rel-08), new features. PRIVACY is owned by rel-03.
- Waits for: rel-04 to rel-06 and the short-feeds packages sf-01 to sf-04
  ([[plan-short-feeds]]), which ship in 0.1.0.
- Read first: [[release-pipeline]], [[unsigned-first-then-signpath]],
  [[webview2-diagnostics-disclosed]].

## Acceptance criteria
- [ ] Fresh Windows in Windows Sandbox (the maintainer turns it on once; a `.wsb`
      logon script creates a standard local account, as the Sandbox user is an
      administrator): setup and portable start without UAC, the first-start notice
      shows, YouTube plays; SmartScreen behaviour noted.
- [ ] Update path proven before 0.1.0: rc.1 → rc.2 by click and automatically, with
      a test build whose endpoint points at the rc release (`/releases/latest` skips
      pre-releases).
- [ ] Live service checks by the maintainer on the installed, CI-built rc.
- [ ] Budgets met on the CI-built exe (`npm run measure`).
- [ ] `npm run smoke:real` (the `@real` set, about a minute, asked) green on a local
      build of the commit to be tagged ([[app-tests-run-hidden]]).
- [ ] Minimum tested WebView2 version written down.
- [ ] Tag `v0.1.0` pushed on the maintainer's explicit request; release public.

## Checks
- `npm run verify`, `npm run smoke:real`, `npm run measure`, fresh-Windows run, live
  checks (maintainer).

## Resume here
Not started; waits for rel-04 to rel-06 and sf-01 to sf-04.
