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
4. **Judge task clarity before entering plan mode.** If `$1` is concrete enough to ground a meaningful Mission and Acceptance Criteria — i.e. it names *what* and gives at least a hint of what "done" looks like — proceed. If it isn't (e.g. `fix it`, `improve performance`, `clean it up`), ask one short clarifying question and wait for the answer before continuing. Use judgment, not heuristics: don't enforce length or word-count thresholds. The bar is "can I draft a contract that wouldn't just be padding?" — not "did the user type enough characters." The slug itself does not need a separate confirmation round; it'll be surfaced for review inside the plan-mode submission below.

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

## Plan (via plan mode)

Plan Anchor delegates the entire contract + plan to Claude Code's native plan mode. There is **no separate intake turn** — the plan-mode submission is the single review point where the user confirms slug, Mission, Scope, Non-Goals, Constraints, AC, and the technical plan in one consolidated approval. Anything the user wanted to constrain upfront either lives in `$1` already or gets corrected during the plan-mode review.

1. **Enter plan mode** with `EnterPlanMode`. Read whatever code you need to ground the draft — `Read`, `Grep`, `Bash` for inspection are still allowed inside plan mode. Before drafting, **extract any Non-Goals or Constraints already present in `$1`** (e.g. "without breaking v1 clients", "don't touch the payment module") so they're recorded as user-supplied rather than inferred.
2. **Draft the contract + plan** as one structured document, in **this exact order**. The contract sections come *before* the technical plan because they're the highest-stakes part of the review and the easiest to rubber-stamp. Use this template:

   ```
   Proposed slug: <slug> — reply with a different slug if you'd like to change it.

   > The five contract sections below were drafted from your task description plus a code read.
   > **Please review and correct as needed before accepting** — this contract is what
   > /plan-anchor:done refuses to skip and /plan-anchor:drift checks against.

   ## Mission *(draft — confirm or correct)*
   <one sentence stating the outcome, derived from $1 and refined by the code read>

   ## Scope (in) *(draft — confirm or correct)*
   - <files / modules / behaviors the task will touch — bound this, vague scope is the failure mode>

   ## Non-Goals *(draft — confirm or correct)*
   - <items extracted verbatim from $1 if any>
   - <items inferred from the code (e.g. "don't change the public signature of X — N callers depend on it")>
   - If, after reading the code, you genuinely cannot infer any, write a single bullet:
     `_None inferred — please add any out-of-scope items you have in mind._`

   ## Constraints *(draft — confirm or correct)*
   - <items extracted verbatim from $1 if any>
   - <items inferred from code/repo (e.g. "lockfile is pinned — no new runtime deps", "public API exported via /src/index.ts must stay stable")>
   - If none inferred, write `_None inferred — please add any constraints you have in mind._`

   ## Acceptance Criteria *(draft — confirm or correct)*
   - **AC1** — <observable condition>
   - **AC2** — <observable condition>
   - <2–5 total, each numbered, each observable — not "code is clean">

   ---

   ## Approach
   <1–2 sentences naming the chosen technical approach>

   ## Phases
   <ordered list of implementation phases>

   ## Verification strategy
   <how each AC will be checked, referencing AC ids>

   ## Drift guardrails
   <the Constraints above + any architectural invariants the plan depends on staying true>
   ```

3. **Submit via `ExitPlanMode`**. The user accepts, rejects, or asks for revisions. Revisions to **slug, any contract section, or the technical plan** are all first-class — redraft and resubmit. Iterate until accepted. If the user pushes back on a Non-Goal or Constraint specifically, treat that as a higher-trust correction (it's tacit knowledge the agent couldn't have known).
4. **Capture the approved submission verbatim**. Everything the user just approved lands in state.md as-is — do not redraft from memory. Drop the `(draft — confirm or correct)` markers and the leading instruction blockquote; the contract is now canonical and the guardrails (G3, G4) gate against it.

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

1. Fill frontmatter: `task` (human-readable — derive from `$1`), `slug` (the final slug as approved in the plan-mode submission — derived or user-overridden), `status: active`, `created` and `updated` = current ISO 8601 UTC, `active_wu: WU-1`.
2. Fill **Mission**, **Scope**, **Non-Goals**, **Constraints**, and **Acceptance Criteria** from the approved plan-mode submission. Strip the `(draft — confirm or correct)` markers — the contract is canonical now.
3. Fill **Plan** (Approach / Phases / Verification strategy / Drift guardrails) from the approved plan-mode submission.
4. Fill **Work Units** from the Decompose step above.
5. `Verification` table: include only the layers that will actually be used; mark all rows `not_run`.
6. `Drift Log`: leave as `_None._`.
7. `Handoff`: write the minimal initial handoff so a fresh agent could resume immediately.

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
