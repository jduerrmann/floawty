---
type: note
tags: [questions]
status: active
created: 2026-11-16
updated: 2026-11-24
source: conversation
---

# Open questions

Unresolved decisions. Remove an entry once it is answered and recorded in the owning
note or decision. Numbers are not reused.

| # | Question | Answered by | Blocks |
|---|---|---|---|
| 6 | Allow only one running floawty (single-instance guard, new dependency `tauri-plugin-single-instance`)? A second instance with another graphics-acceleration setting cannot start (logged) | maintainer | rel-04 |
| 12 | Should the "Animations" switch say so when Windows' reduced motion overrides it (switch on, floawty still)? Until then it says nothing ([[animations-switch]]) | maintainer | – |
| 13 | Can floawty's main window appear sooner than about 250 ms after the start (warm), e.g. by showing it before the home page has loaded, without a white flash? ([[start-budget-main-window]]) | agent investigation, maintainer decides | – |
| 14 | Which app test script runs in CI against the installed exe (rel-06: smoke test before upload)? The hidden desktop is unproven on a GitHub runner; `smoke:hidden` there needs a trial ([[tech-app-tests]]) | rel-06, maintainer | rel-06 |

Answered: #11 Windows Sandbox for app tests → not needed, they run on a hidden desktop
([[app-tests-run-hidden]]); #10 the tilt's RAM → [[animations-switch]] (stays the default, can be off); sleeping home → [[home-stays-awake-under-a-service]]; #9 TikTok's ad label stays visible → [[tiktok-as-short-feed]]; #7 principle 3 wording and #8 export fields → [[updates-by-tauri-updater]],
[[settings-export-without-logins]]; #5 free aspect ratio → [[overlay-shape-free-with-zoom]]; #1 stack and #2 budgets → [[stack-by-spike]]; #3 UI scope →
[[overlay-controls]]; #4 Widevine download → [[widevine-on-demand-with-notice]],
superseded by [[webview2-diagnostics-disclosed]].
