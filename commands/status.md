---
description: Print the current Plan Anchor task's state compactly (~30 lines), including the sync state of the mirrored native Tasks. Read-only.
allowed-tools: [Read, Bash, TaskList]
---

Print the current Plan Anchor task's state. Read-only — do not modify any file.

## Resolve the current task

1. Read `.claude/plan-anchor/current.txt`. If missing or empty, output:

   ```
   No active Plan Anchor task. Use /plan-anchor:start <task description> to begin.
   ```

   and stop.

2. Let `slug` be the single line in `current.txt`. Read `.claude/plan-anchor/<slug>.md`. If the file is missing, warn and stop.

## Look up mirrored Tasks

Call `TaskList` and keep only the rows whose `subject` starts with `[<slug>] WU-`. Build a map `{ "WU-N": <task-status> }`. If `TaskList` returns nothing matching this prefix, the task was created before M6 (or Tasks were never mirrored); fall back to rendering state alone.

## Render

Print exactly this shape, filled in from the state file. Do not add ornamentation or commentary before or after.

```
Task: <task> (slug: <slug>) — <status>

Mission: <one-line mission>

Acceptance:
  AC1 [<status>] <description>  <evidence-short-or-blank>
  AC2 [<status>] <description>  <evidence-short-or-blank>
  ...

Work Units:                     state.md ↔ Tasks
  WU-1 <state-status> — <goal>  (Task: <task-status>)
  WU-2 <state-status> — <goal>  (Task: <task-status>)
  ...

Active: <active_wu or none> — <active WU goal>
Done-when remaining (active WU):
  - <unchecked condition>
  - <unchecked condition>

Verification:
  <layer> <status> <command-short>
  ...

Drift: <none | N open rows — 1-line summary each>

Next: <smallest next action from Handoff>
```

## Rules

- Use `[ ]`/`[x]` for AC checkbox rendering, plus status in words (`pending`/`in_progress`/`complete`/`deferred`).
- If `evidence` is multi-line or long, truncate to ~60 chars with `…`.
- If the active WU's Done-when list is fully checked but the WU is not `complete`, append a line:
  `⚠ Active WU has all Done-when checked but is not marked complete — run verification, then close.`
- For each WU row, compare state-status (state.md) and task-status (TaskList) and translate via:
  - `pending`/`pending`, `active`/`in_progress`, `complete`/`completed`, `blocked`/`<no native equivalent — render as pending>`.
  - When the two diverge, append `(out of sync)` to that row, e.g. `WU-2 active — display saved filters  (Task: pending — out of sync)`. The user can re-run `/plan-anchor:status` after `/plan-anchor:done` or other transitions to see them re-align.
- If the WU lookup found no Tasks at all, omit the `(Task: ...)` columns and add one footer line: `(no mirrored Tasks for this slug — pre-M6 task or Tasks not initialized)`.
- If the Drift Log has open rows, list each as `• <deviation> (<status>)` under `Drift:`.
- Cap total output at ~40 lines. Skip sections that are entirely empty (but always include Active and Next).
