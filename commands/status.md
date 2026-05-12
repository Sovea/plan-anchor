---
description: Print the current Plan Anchor task's state compactly (~30 lines). Read-only.
allowed-tools: [Read, Bash]
---

Print the current Plan Anchor task's state. Read-only — do not modify any file.

## Resolve the current task

1. Read `.claude/plan-anchor/current.txt`. If missing or empty, output:

   ```
   No active Plan Anchor task. Use /plan-anchor:start <slug> to begin.
   ```

   and stop.

2. Let `slug` be the single line in `current.txt`. Read `.claude/plan-anchor/<slug>.md`. If the file is missing, warn and stop.

## Render

Print exactly this shape, filled in from the state file. Do not add ornamentation or commentary before or after.

```
Task: <task> (slug: <slug>) — <status>

Mission: <one-line mission>

Acceptance:
  AC1 [<status>] <description>  <evidence-short-or-blank>
  AC2 [<status>] <description>  <evidence-short-or-blank>
  ...

Work Units:
  WU-1 <status> — <goal>
  WU-2 <status> — <goal>
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
- If the Drift Log has open rows, list each as `• <deviation> (<status>)` under `Drift:`.
- Cap total output at ~40 lines. Skip sections that are entirely empty (but always include Active and Next).
