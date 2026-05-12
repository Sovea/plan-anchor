---
description: Create a new Plan Anchor task — capture mission, acceptance criteria, plan (via plan mode), and Work Units (mirrored as native Tasks) into .claude/plan-anchor/<slug>.md.
argument-hint: <task-slug>
allowed-tools: [Read, Write, Edit, Bash, EnterPlanMode, ExitPlanMode, TaskCreate, TaskUpdate]
---

Start a new Plan Anchor task with slug `$1`.

## Preconditions

1. If `$1` is empty or missing, ask the user for a kebab-case slug (letters, digits, dashes; ≤ 60 chars). Do not proceed without one.
2. Validate the slug: must match `^[a-z][a-z0-9-]{1,59}$`. If invalid, show the user what's wrong and re-ask.
3. Check `.claude/plan-anchor/<slug>.md`:
   - If it exists and `status: complete` → ask whether to open a new task with a different slug or re-open this one.
   - If it exists and `status: active|blocked` → don't overwrite. Suggest `/plan-anchor:resume <slug>` and stop.
   - If it does not exist → proceed.

## Repository setup

Run once, quietly:

```bash
mkdir -p .claude/plan-anchor
```

Then ensure the state directory is git-ignored. Prefer a **directory-scoped** gitignore so we never touch the user's root `.gitignore`:

- If `.claude/plan-anchor/.gitignore` does not exist, create it with a single line: `*`.
  - This makes the whole state directory untracked regardless of the repo's root `.gitignore`, works even on repos not under git, and leaves the user's top-level ignore file alone.
- If it already exists, leave it alone.

Do **not** modify the repo's root `.gitignore`.

Tell the user in one line what you did ("created .claude/plan-anchor/.gitignore" or "already present").

## Intake

Walk the user through the five intake questions. Ask them in one turn when possible; don't fire separate questions unless the answer genuinely needs clarification. Keep the user's answers compact — bullets, not paragraphs.

1. **Mission**: one sentence describing the outcome.
2. **Scope**: what's in.
3. **Non-goals**: what's explicitly out.
4. **Constraints**: technical, product, time, compatibility, security, process.
5. **Acceptance criteria**: observable conditions; aim for 2–5. Each becomes AC1, AC2, …

If any item is missing or would change the solution, ask before continuing. Don't fabricate answers. Refer to `skills/plan-anchor/references/guardrails.md` for why intake can't be skipped.

## Plan (via plan mode)

Plan Anchor delegates the Plan phase to Claude Code's native plan mode. This eliminates double-drafting (once for ExitPlanMode, once for state.md) and uses the harness's built-in approval UX.

1. **Enter plan mode** with `EnterPlanMode`. Read whatever code you need to understand the task — `Read`, `Grep`, `Bash` for inspection are still allowed inside plan mode.
2. **Draft the plan** as a structured document with these four sections (this format is what `ExitPlanMode` will surface to the user):
   - **Approach**: 1–2 sentences naming the chosen technical approach.
   - **Phases**: ordered list of implementation phases.
   - **Verification strategy**: how each AC will be checked.
   - **Drift guardrails**: constraints that must not be violated during execution.
3. **Submit via `ExitPlanMode`**. The user accepts, rejects, or asks for revisions. Iterate until accepted.
4. **Capture the approved plan verbatim**. The text the user just approved is what lands in state.md's Plan section — do not redraft it from memory.

For trivial single-file tasks where plan mode would be overhead, the operator can decline plan mode at intake time and you draft the plan inline. Default is to use plan mode.

## Decompose

Break the plan into Work Units. Rules:

- Each WU is independently verifiable.
- Each WU maps to at least one AC. If a WU doesn't, either remove it or justify inline in its body.
- One WU is marked `active` — usually WU-1. The rest are `pending`.
- Assign each WU a concrete `Scope` (files / modules / areas it's allowed to touch). This field is what the `pre_edit` hook checks.

### Mirror each WU as a native Task

For each Work Unit you just declared, create a corresponding native Task so the user sees per-WU progress in Claude Code's native task UI alongside the state file:

- Call `TaskCreate` with:
  - `subject`: `[<slug>] WU-N: <one-line goal>` — the `[<slug>]` prefix lets `/plan-anchor:status` and `/plan-anchor:done` find this task later via `TaskList`.
  - `description`: copy from the WU's body (Done-when conditions are useful here).
  - `activeForm`: `Working on WU-N: <goal>`.
- After all Tasks are created, call `TaskUpdate` on the Task for `WU-1` (the initially-active WU) to set `status: in_progress`. Leave the others as `pending`.

State.md is the canonical record of WU state. The native Tasks are a presentation mirror managed by `/plan-anchor:start`, `/plan-anchor:done`, and `/plan-anchor:status`. Hooks do not touch Tasks.

## Write the state file

Render the state using the template at `skills/plan-anchor/state/template.md`:

1. Fill frontmatter: `task` (human-readable), `slug` (= `$1`), `status: active`, `created` and `updated` = current ISO 8601 UTC, `active_wu: WU-1`.
2. Fill every section from the intake, plan, and decomposition above.
3. `Verification` table: include only the layers that will actually be used; mark all rows `not_run`.
4. `Drift Log`: leave as `_None._`.
5. `Handoff`: write the minimal initial handoff so a fresh agent could resume immediately.

Write the file to `.claude/plan-anchor/$1.md` using the Write tool.

## Set current

Write the slug to `.claude/plan-anchor/current.txt` (single line, no trailing newline beyond one).

## Confirm

Print a 4-line confirmation:

```
Started Plan Anchor task: <task-name> (slug: <slug>)
State: .claude/plan-anchor/<slug>.md
Active: WU-1 — <goal>
Next: <smallest next action>
```

Do not take any further implementation action in this turn. The next user prompt or tool use continues the work.
