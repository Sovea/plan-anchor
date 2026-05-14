---
description: Smart dispatcher — read state and do the right next thing: dispatch to a /plan-anchor:* sub-command, or continue implementation of the active Work Unit.
allowed-tools: [Read, Bash, Skill, Edit, Write, MultiEdit, Grep, Glob]
---

Read the current Plan Anchor state and decide what should happen next, then either invoke the matching sub-command or continue implementation work directly. The user gets one entry point that always does "the right next thing" without having to remember the full command surface.

## Resolve the current task

1. Read `.claude/plan-anchor/current.txt`. If missing or empty, **print** `No active Plan Anchor task. Use /plan-anchor:start <task description> to begin.` and stop. Do not invoke any other command.
2. Read `.claude/plan-anchor/<slug>.md`. If the file is missing, print `current.txt points at "<slug>" but .claude/plan-anchor/<slug>.md is missing — repair manually or re-run /plan-anchor:start.` and stop.

## Decide

Apply these rules **in order**. The first matching rule wins; later rules don't fire.

| # | Condition | Action | Why |
| --- | --- | --- | --- |
| 1 | `Drift Log` has any row with `status: open` | invoke `/plan-anchor:drift` | Open drift blocks safe progress; resolve before anything else. |
| 2 | Frontmatter `status` is `complete` already | invoke `/plan-anchor:status` and add a one-line note: `Task is complete. Use /plan-anchor:start <task description> for a new one or /plan-anchor:resume <slug> to switch to another.` | Nothing left to do on this task. |
| 3 | Every Work Unit has `status: complete` (and overall task status is not `complete` yet) | invoke `/plan-anchor:done` | The completion gate should run; failures will be surfaced. |
| 4 | The active Work Unit has every `Done when` checkbox `[x]` but its own status is still `active` | invoke `/plan-anchor:done` | Same as above — the gate decides whether to advance. |
| 5 | No active Work Unit but at least one is `pending` | print `Promote the next pending WU to active. Suggested next: <WU-id>: <goal>. Edit .claude/plan-anchor/<slug>.md to set its status to active and update active_wu in frontmatter.` then stop. | The user (or next /plan-anchor:start invocation) needs to choose. We don't auto-promote. |
| 6 | An active WU exists with at least one unchecked `Done when` | **continue implementation** — read the first unchecked `Done when` of the active WU and begin work on it; do not dispatch to a sub-command | The next step is real implementation work; surfacing status again would just stall the user. The `pre_edit` hook still gates scope on the first edit. |
| 7 | Anything else | invoke `/plan-anchor:status` | Default — surface state and let the user decide. |

## How to invoke

For rules that dispatch to a sub-command (1, 2, 3, 4, 7): use the `Skill` tool with `skill: plan-anchor:<sub>` (no leading slash). Pass any required `args` (e.g., none for `/plan-anchor:status`, the slug for `/plan-anchor:resume`).

For rule 6 (continue implementation): do not call `Skill`. Continue the turn directly — read the active WU's first unchecked `Done when`, then start the implementation work (Read / Grep / Edit / Write / Bash as needed).

For rule 5 (no active WU but pending exist): print the suggested promotion and stop.

Before any of the above, **print one short line stating which rule fired and what will happen next**, e.g.:

```
[next] Open drift detected (rule 1) → running /plan-anchor:drift.
[next] Active WU has unchecked work (rule 6) → continuing implementation of WU-2: <first unchecked Done-when>.
```

This gives the user a chance to interrupt if the dispatch is wrong for their situation.

## Rules

- Never invoke `/plan-anchor:start` from `:next` — starting a new task is an explicit user act.
- Never invoke `/plan-anchor:resume <slug>` from `:next` to change tasks — switching tasks is an explicit user act. (Calling `/plan-anchor:resume` without a slug to recover the current task is fine, but no rule above does so.)
- If two rules could both apply (e.g., open drift AND active WU done), rule 1 (drift) wins. Drift always takes priority.
- At most one sub-command dispatch per `:next` call (rules 1–4, 7). Rule 6 does not dispatch; it continues implementation in the same turn until the agent naturally yields. If the user wants to chain another `:next` after that, they re-run it.
