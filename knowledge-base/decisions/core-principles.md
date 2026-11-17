---
type: decision
area: process
tags: [principles, license, privacy]
status: active
created: 2026-11-16
updated: 2026-11-17
source: conversation
---

# floawty is free, local and fair to the services

## Context

floawty should be usable by anyone who finds it on GitHub, without trusting a
company, creating an account or paying. It displays content from commercial streaming
services, which brings legal and ethical constraints.

## Decision

1. License **GPL-3.0**, so forks and redistributions stay open source.
2. **No ads, no monetization** inside the app.
3. **No server** operated by the project. Outgoing connections only to the services
   the user opens and to GitHub Releases for an update check the user triggers or
   turns on (off by default). Amended by [[widevine-on-demand-with-notice]].
4. **No telemetry or tracking**, not even opt-in.
5. **No accounts and no API keys.**
6. Distribution only via **GitHub Releases**, built by GitHub Actions; portable build
   and installer, no admin rights. Windows first.
7. Only the **official web players** are embedded: no DRM circumvention, no
   downloading or recording, no ad blocking, no credential handling.
8. **Light on resources:** runs next to other work on an ordinary PC.

## Alternatives

- MIT license – rejected: would allow closed, ad-supported forks without sharing code.
- Opt-in telemetry or crash reports – rejected: every network call needs trust; bug
  reports go through GitHub issues.
- YouTube Data API for Shorts – rejected: needs an API key and a quota owner.

## Consequences

- Features that need a backend (sync, shared playlists, remote config) are out of
  scope.
- Adapters depend on public websites and break when sites change; the adapter
  architecture must keep those fixes cheap.
- Unsigned Windows builds trigger SmartScreen warnings until a free OSS code-signing
  option (e.g. SignPath Foundation) is set up.
