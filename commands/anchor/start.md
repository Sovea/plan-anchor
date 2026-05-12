---
description: Create a new Plan Anchor task — capture mission, acceptance criteria, plan, and Work Units into .claude/plan-anchor/<slug>.md.
argument-hint: <task-slug>
allowed-tools: [Read, Write, Edit, Bash]
---

Start a new Plan Anchor task with slug `$1`.

## Preconditions

1. If `$1` is empty or missing, ask the user for a kebab-case slug (letters, digits, dashes; ≤ 60 chars). Do not proceed without one.
2. Validate the slug: must match `^[a-z][a-z0-9-]{1,59}$`. If invalid, show the user what's wrong and re-ask.
3. Check `.claude/plan-anchor/<slug>.md`:
   - If it exists and `status: complete` → ask whether to open a new task with a different slug or re-open this one.
   - If it exists and `status: active|blocked` → don't overwrite. Suggest `/anchor:resume <slug>` and stop.
   - If it does not exist → proceed.

## Repository setup

Run once, quietly:

```bash
mkdir -p .claude/plan-anchor
```

Then ensure `.claude/plan-anchor/` is gitignored. Check for a `.gitignore` at the repo root:

- If `.gitignore` does not exist: create it with the single line `.claude/plan-anchor/`.
- If `.gitignore` exists and does not include `.claude/plan-anchor/` or a broader pattern that covers it: append `.claude/plan-anchor/` on a new line.
- If already covered: leave it alone.

Tell the user in one line what you did (created / appended / already covered).

## Intake

Walk the user through the five intake questions. Ask them in one turn when possible; don't fire separate questions unless the answer genuinely needs clarification. Keep the user's answers compact — bullets, not paragraphs.

1. **Mission**: one sentence describing the outcome.
2. **Scope**: what's in.
3. **Non-goals**: what's explicitly out.
4. **Constraints**: technical, product, time, compatibility, security, process.
5. **Acceptance criteria**: observable conditions; aim for 2–5. Each becomes AC1, AC2, …

If any item is missing or would change the solution, ask before continuing. Don't fabricate answers. Refer to `skills/plan-anchor/references/guardrails.md` for why intake can't be skipped.

## Plan

Based on intake, draft a plan the user can accept or edit:

- **Approach**: 1–2 sentences. Name the chosen technical approach.
- **Phases**: ordered list of implementation phases.
- **Verification strategy**: how each AC will be checked.
- **Drift guardrails**: constraints that must not be violated during execution.

For architecture-sensitive or multi-file work, prefer plan mode for this step so the user can approve the plan explicitly.

## Decompose

Break the plan into Work Units. Rules:

- Each WU is independently verifiable.
- Each WU maps to at least one AC. If a WU doesn't, either remove it or justify inline in its body.
- One WU is marked `active` — usually WU-1. The rest are `pending`.
- Assign each WU a concrete `Scope` (files / modules / areas it's allowed to touch). This field is what `pre_edit` hooks (M3) will check.

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
