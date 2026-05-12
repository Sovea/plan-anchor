---
description: Refresh the Handoff section of the current state file so a fresh agent can resume without reading conversation history.
allowed-tools: [Read, Edit, Bash]
---

Refresh the Handoff section of the current Plan Anchor task.

## Resolve the current task

1. Read `.claude/plan-anchor/current.txt`. If missing/empty, output "No active task" and stop.
2. Read `.claude/plan-anchor/<slug>.md`.

## Gather ground truth

Collect the facts the Handoff section will summarize:

- **Branch**: `git rev-parse --abbrev-ref HEAD`.
- **Worktree**: `clean` if `git status --porcelain` is empty, otherwise `modified`.
- **Files actually touched** since the task started: `git diff --name-only HEAD` (uncommitted) plus `git log --since=<state.created> --name-only --pretty=format:` (committed on this branch). Deduplicate. Cap at 20 entries; if more, keep the 20 most recent and append `… (+N more)`.
- **Completed WUs** and **Remaining WUs** from the state file.
- **Active WU**: its goal, its `Done when` list (checked + unchecked), and a one-sentence `current_state` derived from which Done-when items are done vs. pending.
- **Open blockers**: any WU with `status: blocked` plus its blocker text; any open rows in the Drift Log requiring approval.
- **Smallest next action**: the first unchecked Done-when of the active WU, expressed as an imperative verb phrase.

## Rewrite the Handoff section

Replace the existing `# Handoff` section in `.claude/plan-anchor/<slug>.md` with:

```
# Handoff

- Repository assumptions: branch=<branch>, worktree=<clean|modified>
- Completed WUs:
  - WU-N: <one-line outcome with evidence pointer>
  - ...
- Active WU: WU-M — <goal>
  - Current state: <derived state sentence>
  - Done-when remaining:
    - <condition>
    - <condition>
- Remaining WUs:
  - WU-K: <goal>
- Files touched:
  - <path> — <why relevant>
- Open blockers: <None | list>
- Smallest next action: <imperative next step>
```

Use the Edit tool. Do not touch any other section. Do not create a second `# Handoff` block if one already exists — replace it.

Also bump the frontmatter `updated:` field to the current ISO 8601 UTC timestamp.

## Output

Print a 3-line summary:

```
Handoff refreshed for <slug>.
Active: WU-M — <goal>
Next: <imperative>
```

## When to invoke

- Before pausing unfinished work.
- Before context compaction (the `pre_compact` hook in M3 will call this automatically; until then it's manual).
- Before switching tasks or ending a session.
- Whenever the Active WU transitions (e.g., on WU-1 completing and WU-2 becoming active).
