# floawty – Working rules

@AGENTS.md

This file is the Claude entry point: it imports the shared rules above and adds the
Claude-only section below. Edit shared rules only in `AGENTS.md`.

## Claude-only: plan visually

Use the `visual-plan` skill whenever it applies: a new feature, a new window or view,
a changed layout or behavior with more than one design decision, an architecture or
stack question (including the evaluation of the stack spike), and before any
multi-step implementation. The page replaces question rounds in chat; build only
after the maintainer has approved it, then turn the result into decisions, a plan
map and packages (`knowledge-base/planning.md`). Pure execution (rename, typo, a fix
with one obvious solution) and single factual questions stay in chat.

`.claude/settings.json` asks before every `git commit` and `git push` and denies
destructive Git commands and blanket staging. It guards against slips; never
rephrase a command to get around it.
