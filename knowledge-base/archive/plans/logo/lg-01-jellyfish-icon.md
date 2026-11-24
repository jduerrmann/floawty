---
type: plan
tags: [package, logo, icon, readme]
status: done
created: 2026-11-22
updated: 2026-11-24
source: visual plan "Neues Logo für floawty"
---

# lg-01 – Jellyfish icon and README header

Plan: [[plan-logo]]

## Outcome
EXE, taskbar and README show floawty's jellyfish.

## Scope
- Owns: `src-tauri/icons/`, `assets/brand/`, `scripts/build-icons.mjs`, the `icons`
  script in `package.json`, `src/app-icon.test.ts`, the README header.
- Non-goals: logo inside the app, installer artwork, service logos, new dependencies.
- Read first: [[jellyfish-brand]].

## Acceptance criteria
- [x] The mark is recognisable at 16 px and has one shape at every size.
- [x] It works on a light and a dark taskbar (half the area at 3 : 1).
- [x] Own SVG only: no font, raster source or package.
- [x] EXE and taskbar show the new icon.
- [ ] The README shows the logo for GitHub's light and dark theme (verified locally;
      to be seen on GitHub after a push).

## Tests first
- `src/app-icon.test.ts`: frame sizes, config PNG sizes, one silhouette in all
  sources, plain SVG. Red on the scaffold icon (15 of 17), then green.

## Checks
- `npm run check`, build, icons read back from the EXE, independent review, app run
  after the maintainer's yes.

## Evidence (2026-11-22)
- npm run check: passed. npm run build: passed, the app was not started.
- The ICO's six frames equal the approved preview byte for byte; read back from the
  built EXE, their alpha and opaque pixels are identical to it.
- Share of the icon at 3 : 1, dark / light taskbar: 16: 56.3 / 69.4, 20: 63.5 / 66.0,
  24: 61.0 / 69.8, 32: 55.6 / 73.2, 48: 53.4 / 71.8, 256: 52.9 / 73.8 %.
- The frames LoadImage returns at 32, 40 and 48 px were looked at shrunk to 24, 30, 36
  and 16 px on both taskbar colours.
- README header rendered in headless Chromium: the right file per colour scheme.
- npm run icons twice: same bytes.
- Resources not measured: no code in window handling, page scripts or startup changed.

## Review (advisor, 2026-11-22): ready after small fixes
1. Window icon source unproven – rejected on source evidence, confirm in the app run:
   tauri-codegen 2.7.5 (context.rs) uses default_window_icon_from_app_icon_resource on
   Windows, which tauri 2.12.6 (image/mod.rs) loads from resource 32512 at SM_CXICON,
   so by size and not by entry order. The app run reads WM_GETICON.
2. Stale ICO undetected – documented in the decision, as the reviewer proposed.
3. ICO directory untested – fixed; wrong height and byte count now fail the test.
4. GitHub rendering unproven – the acceptance box stays open until a push.
Minor: self-comparison, colour and logo drift, plain-SVG pattern and test name fixed
(each new check seen failing on a mutated file); guidance linked. Kept: the h1 image
(alt gives the name, nothing links its anchor) and the two config PNGs (existing
config, outside this package).

## App run (maintainer's yes, 2026-11-22): verify failed, icon checks passed
- npm run verify: check green (Vitest 92, adapter 100, cargo 123), build green, app
  tests 40/41.
- Failed: bar.spec.ts "the service follows the window size …", in launch(), before
  any step of the test: floawty's pages were not found within 5 s.
- Cause, inferred from the run's traces and not reproduced: the test took 5.0 s in
  all, so connect() succeeded at its first try, yet that start's WebView2 folder
  appeared only 170 ms after the profile was made. The port was then still held by
  the previous test's WebView2: stop() kills floawty and does not wait for port 9334
  to close, launch() takes the first browser that answers. floawty itself logged a
  normal start. tests/app.ts is unchanged by this package.
- Window icon (WM_GETICON, 96 dpi): 32 x 32, opaque pixels identical to the 32 px
  frame (review finding 1 confirmed closed). Seen sharp on both taskbars.

## Rebased on main (2026-11-23)
- The work moved uncommitted onto main 2df7643, which carries the race fix ee2723d;
  the only conflict, the plan row in [[active-plans]], keeps both rows.
- npm run check: passed (Vitest 123, adapter 161, cargo 129). The review stands: main
  touches none of this package's files except the shared lists.

- npm run build: passed. App stage 1 (maintainer's yes): `bar.spec.ts` alone, 10/10
  green in 25 s, the spec that failed on 2026-11-22 included.

## Final run on main a0707c0 (2026-11-24)
- Moved uncommitted onto main a0707c0 (quiet tests, CI); no conflict. The review
  stands: main touches none of this package's files except the shared lists.
- npm run check, build, build:test-input: passed. `smoke:hidden`: 47/47 green.

## Resume here
Done; committed to `main` and archived. Left: see the README logo on GitHub in light
and dark after the push.
