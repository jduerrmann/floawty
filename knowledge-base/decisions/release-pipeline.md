---
type: decision
area: dist
tags: [release, ci, installer, portable]
status: active
created: 2026-11-20
updated: 2026-11-20
source: visual plan "Phase 3 – Release-Pipeline", rounds 1–2
---

# Releases publish from a tag after local checks, as installer and portable

## Context
Phase 3 makes floawty downloadable. Principle 6 asks for GitHub Releases built by
GitHub Actions, a portable build and an installer, no admin rights. Open were when a
release becomes public, where the portable build keeps its data, what CI checks, and
how a missing WebView2 is handled.

## Decision
- CI runs `npm run verify` on `windows-latest` for every pull request and push to
  `main`, smoke test included; an unstable smoke test is skipped in CI and runs
  locally before every release.
- Release: the maintainer runs `npm run verify` and the live service checks locally,
  then pushes `vX.Y.Z`; the workflow publishes at once, no draft. It fails when the
  tag and the version numbers differ or the CHANGELOG has no section for it.
- Assets: `floawty-X.Y.Z-setup.exe` (NSIS, current user, EN/DE, downloads WebView2 if
  missing), `floawty-X.Y.Z-portable.exe`, `SHA256SUMS.txt`, updater files. Windows
  x64 only; the release text is the CHANGELOG section.
- The portable build keeps its data in the user folders like the installer; without
  WebView2 it shows a message with a download link.
- Tags must point at `main`; the release is published only after every asset is
  attached. Release candidates `vX.Y.Z-rc.N` are public GitHub pre-releases that the
  stable update endpoint ignores.
- The first public version is 0.1.0.

## Alternatives
- Draft release, published after a check of the built files – rejected by the
  maintainer: checks happen locally before the tag.
- Portable data next to the exe – rejected: logins on a lost stick, fails in
  read-only folders.
- MSI – needs admin rights.
- CI without smoke test – kept only as the fallback.

## Consequences
- A broken CI build reaches users at once; the workflow runs the checks before upload.
- The published exe is built by CI, not the one checked locally; budgets are measured
  on the CI build before 0.1.0.
- When WebView2 is missing, the installer fetches Microsoft's WebView2 bootstrapper;
  README and PRIVACY say so. The portable build cannot: on such a PC the user installs
  the runtime by hand, a known edge of principle 6.
- Signing follows [[unsigned-first-then-signpath]]; updates follow
  [[updates-by-tauri-updater]].
