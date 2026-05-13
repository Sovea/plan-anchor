---
description: Smart dispatcher — read state and call the right /plan-anchor:* sub-command for the current situation.
allowed-tools: [Read, Bash, Skill]
---

Read the current Plan Anchor state and decide which sub-command should run next, then invoke it. The user gets one entry point that always does "the right next thing" without having to remember the full command surface.

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
| 6 | An active WU exists with at least one unchecked `Done when` | invoke `/plan-anchor:status` | Show the user where they are — the next step is doing real work, not running another plan-anchor command. |
| 7 | Anything else | invoke `/plan-anchor:status` | Default — surface state and let the user decide. |

## How to invoke

Use the `Skill` tool with `skill: plan-anchor:<sub>` (no leading slash). Pass any required `args` (e.g., none for `/plan-anchor:status`, the slug for `/plan-anchor:resume`).

Before invoking, **print one short line stating which rule fired and which command will run**, e.g.:

```
[next] Open drift detected (rule 1) → running /plan-anchor:drift.
```

This gives the user a chance to interrupt if the dispatch is wrong for their situation.

## Rules

- Never invoke `/plan-anchor:start` from `:next` — starting a new task is an explicit user act.
- Never invoke `/plan-anchor:resume <slug>` from `:next` to change tasks — switching tasks is an explicit user act. (Calling `/plan-anchor:resume` without a slug to recover the current task is fine, but no rule above does so.)
- If two rules could both apply (e.g., open drift AND active WU done), rule 1 (drift) wins. Drift always takes priority.
- Do not loop: invoke at most one sub-command per `:next` call. If the user wants to chain, they re-run `:next`.
