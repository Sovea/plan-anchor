---
description: Switch the current Plan Anchor task pointer to another existing task's slug. Does not run the full resume sequence.
argument-hint: <task-slug>
allowed-tools: [Read, Write, Bash]
---

Switch the `current.txt` pointer to task `$1`.

## Checks

1. If `$1` is empty or missing, list existing `.claude/plan-anchor/*.md` slugs (excluding `current.txt`) and ask the user which to switch to. Do not proceed without a slug.
2. Verify `.claude/plan-anchor/$1.md` exists. If not:
   - Output `No task "<slug>". Use /anchor:start <slug> to create it, or one of: <list of existing slugs>.`
   - Stop.

## Switch

Write `$1` to `.claude/plan-anchor/current.txt` (single line, overwrite). That is the only side effect.

## Output

Print two lines:

```
Switched current task to <slug>.
Run /anchor:resume to align with the repo and see the next action.
```

Do **not** run the full resume sequence here. `/anchor:switch` is meant to be cheap and side-effect-free beyond the pointer update; the next `/anchor:resume`, `/anchor:status`, or `SessionStart` hook will pick it up.
