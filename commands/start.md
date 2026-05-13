---
description: Create a new Plan Anchor task — capture mission, acceptance criteria, plan (via plan mode), and Work Units (mirrored as native Tasks) into .claude/plan-anchor/<slug>.md.
argument-hint: <task description>
allowed-tools: [Read, Write, Edit, Bash, EnterPlanMode, ExitPlanMode, TaskCreate, TaskUpdate]
---

Start a new Plan Anchor task. `$1` is a free-form task description (e.g. `refactor the auth middleware to use JWT`), not a slug — derive the slug from it.

## Preconditions

1. If `$1` is empty or missing, ask the user for a one-line task description (what they want to accomplish, in their own words). Do not proceed without one.
2. **Derive a slug from the description.** Produce kebab-case matching `^[a-z][a-z0-9-]{1,59}$`:
   - lowercase the text
   - drop filler words (`the`, `a`, `an`, `to`, `for`, `of`, `and`, `in`, `on`, `our`, `my`) and keep the content words that name the work
   - replace any run of non-`[a-z0-9]` with a single `-`
   - strip leading non-letter chars; trim trailing `-`
   - if longer than 60 chars, truncate at the last `-` boundary that fits
   - the slug should be 2–5 words and read like a folder name (e.g. `refactor-auth-middleware`, `migrate-billing-to-stripe`, `fix-csv-import-rounding`)
3. Check `.claude/plan-anchor/<slug>.md`:
   - If it exists and `status: complete` → ask whether to open a new task with a different slug or re-open this one.
   - If it exists and `status: active|blocked` → don't overwrite. Suggest `/plan-anchor:resume <slug>` and stop.
   - If it does not exist → proceed. If the derived slug would collide with an existing-and-active task but the new description is clearly unrelated, append a short disambiguator (e.g. `-v2`) before falling through to the collision branches above.
4. **Surface the slug in the same turn as the intake questions** (see Intake below) — show the user the proposed slug at the top of that turn so they can override it inline. Do not spend a separate round just to confirm the slug. If the user supplies a replacement, validate it against `^[a-z][a-z0-9-]{1,59}$` and use it; otherwise the derived slug stands.

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

Open the turn with a one-line slug preview the user can override inline, e.g.:

> `Proposed slug: refactor-auth-middleware. Reply with a different slug if you'd like to change it; otherwise just answer the questions below.`

Then ask:

1. **Mission**: one sentence describing the outcome.
2. **Scope**: what's in.
3. **Non-goals**: what's explicitly out.
4. **Constraints**: technical, product, time, compatibility, security, process.
5. **Acceptance criteria**: observable conditions; aim for 2–5. Each becomes AC1, AC2, …

If the user's reply contains a replacement slug, validate and use it (re-run the collision check from Preconditions step 3 against the new slug before continuing). If any intake item is missing or would change the solution, ask before continuing. Don't fabricate answers. Refer to `skills/plan-anchor/references/guardrails.md` for why intake can't be skipped.

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

1. Fill frontmatter: `task` (human-readable — derive from `$1`, not the slug), `slug` (the final slug from Preconditions/Intake — derived or user-overridden), `status: active`, `created` and `updated` = current ISO 8601 UTC, `active_wu: WU-1`.
2. Fill every section from the intake, plan, and decomposition above.
3. `Verification` table: include only the layers that will actually be used; mark all rows `not_run`.
4. `Drift Log`: leave as `_None._`.
5. `Handoff`: write the minimal initial handoff so a fresh agent could resume immediately.

Write the file to `.claude/plan-anchor/<slug>.md` using the Write tool.

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
