# floawty – Working rules

@AGENTS.md

This file is the Claude entry point: it imports the shared rules above and adds the
Claude-only sections below. Edit shared rules only in `AGENTS.md`.

## Claude-only: plan visually

Use the `visual-plan` skill whenever it applies: a new feature, a new window or view,
a changed layout or behavior with more than one design decision, an architecture or
stack question (including the evaluation of the stack spike), and before any
multi-step implementation. The page replaces question rounds in chat; build only
after the maintainer has approved it, then turn the result into decisions, a plan
map and packages (`knowledge-base/planning.md`). Pure execution (rename, typo, a fix
with one obvious solution) and single factual questions stay in chat.

## Claude-only: advisor and coder

When the main session runs Opus 5.5, it leads and uses two project subagents
(`.claude/agents/`); with any other main model it works directly and uses `advisor`
only for the independent review
([advisor-and-coder-subagents](knowledge-base/decisions/advisor-and-coder-subagents.md)).

| Role | Agent | Model | Does |
|---|---|---|---|
| Lead | main session | Opus 5.5 | scope, questions, briefs, integration, diff review, verification, report |
| Worker | `coder` | Sonnet 5.5, effort high, cannot spawn agents | one bounded package or slice: code, tests, assigned docs |
| Adviser and reviewer | `advisor` | Fable 5.2, effort high, read-only | second opinion and independent review |

- `coder` assignments within the current task need no extra OK. They never authorize
  adjacent features, new dependencies, commits or publishing.
- Give `coder` work that can be specified up front with acceptance criteria and test
  cases. Work directly when the solution emerges while working (debugging, UI
  fine-tuning, exploration) or when briefing and review cost more than the work.
  The brief names the package ID, writable files, confirmed behavior, non-goals,
  test cases with expected results, checks, and open points not to guess. The lead
  keeps understanding the code; it never delegates that away.
- Only one agent at a time builds the release app or runs app tests: they share
  `src-tauri/target` and the debug port 9334; the run lock refuses a second app run.
  Cargo checks of two agents only wait for each other. `coder` runs `npm run check`;
  the lead runs the app tests – hidden ones without asking, the rest after the
  maintainer's yes (AGENTS.md rule 10).
- Call `advisor` only: before a hard-to-reverse decision (stored formats, IPC and
  capabilities, navigation guard, adapter contract, dependencies, rules), to check a
  plan map before multi-package work when the plan contains such a hard-to-reverse
  part, when a diagnosis is stuck after a failed attempt, and for the independent
  review (AGENTS.md rule 14). If it contradicts the chosen path, tell the maintainer.
- Review: `advisor` has no shell, so write the diff (`git diff main -- <files>`) plus
  the full text of new, untracked files (`git ls-files --others --exclude-standard`)
  to a file in the scratchpad and name it in the brief, with the package ID, intended
  outcome, risks to examine and the return format. Keep the brief narrow: the diff,
  the few files it needs, no dependency sources. Treat its output as findings to
  verify, not as acceptance.
- Record delegated slices and the review (who, how, resolution) where rule 14 says. New or changed agent files take effect in a new session.

`.claude/settings.json` asks before every `git commit` and `git push` and denies
destructive Git commands and blanket staging. It guards against slips; never
rephrase a command to get around it.
