---
type: note
tags: [questions]
status: active
created: 2026-11-16
updated: 2026-11-16
source: conversation
---

# Open questions

Unresolved decisions. Remove an entry once it is answered and recorded in the owning
note or decision. Numbers are not reused.

| # | Question | Answered by | Blocks |
|---|---|---|---|
| 1 | Tech stack: Electron (castlabs) or Tauri? | spike + maintainer, [[stack-by-spike]] | all app code |
| 2 | Concrete resource budgets (startup, idle RAM, RAM while playing, download size) | spike, [[stack-by-spike]] | [[engineering-standards]] §7 |
| 3 | How much UI beyond the service picker (control bar on hover, tray menu, onboarding)? | maintainer, visual plan | phase 2 |
| 4 | castlabs ECS downloads the Widevine CDM from a Google host on first start. Accept as an exception to "no other network traffic", ask the user first, or avoid? | maintainer, after spike | [[core-principles]] #3 |
