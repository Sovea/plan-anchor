---
description: Layer a revision onto a Plan Anchor task — append new ACs/WUs via plan mode. Defaults to the current task; works on any status (complete / active / blocked). Warns from the 3rd revision onward.
argument-hint: [task-slug]
allowed-tools: [Read, Write, Edit, Bash, EnterPlanMode, ExitPlanMode, TaskCreate, TaskUpdate, TaskList]
---

Layer a revision on top of an existing Plan Anchor task. `$1` is the slug of any existing task; if omitted, the current task in `.claude/plan-anchor/current.txt` is used. Use when a task — closed or in-flight — needs new ACs/WUs without starting a fresh mission.

`/plan-anchor:revise` is **not** a substitute for `/plan-anchor:start`. If the follow-on work has a different mission or non-overlapping ACs, start a new task instead. The 3rd-revision warning exists for exactly that case.

`/plan-anchor:revise` is also distinct from `/plan-anchor:drift`. Drift is **reactive** — work has already deviated from plan and we replan to acknowledge. Revise is **proactive** — the user is deliberately layering new ACs/WUs on top of the existing contract.

## Resolve target task

1. **Resolve the target slug.**
   - If `$1` is provided, use it as the slug; skip to step 2.
   - If `$1` is empty/missing, read `.claude/plan-anchor/current.txt`:
     - If non-empty, use that as the slug; skip to step 2.
     - If empty/missing, list every `.claude/plan-anchor/*.md` (exclude `current.txt` and `*.meta.json`) with each file's frontmatter `status` as `- <slug> [<status>]`. If no files exist, print `No Plan Anchor tasks yet. Use /plan-anchor:start <task description> to begin one.`. Stop without modifying any file.
2. **Verify the target file exists.** If `.claude/plan-anchor/<slug>.md` is missing, list existing slugs (with status) and stop with `No task "<slug>". Available: <list>.`
3. **Read frontmatter `status`.** Accept `complete`, `active`, or `blocked`. Any other value (or unparseable frontmatter) → stop with `Task "<slug>" has unexpected status "<status>" — repair manually.` Remember this **prior status** for the conditional mutation below.
4. **Re-attach if needed.** If the resolved slug differs from the contents of `.claude/plan-anchor/current.txt` (or `current.txt` is empty/missing), overwrite `current.txt` with the slug. Otherwise leave it untouched. The `pre_edit` hook will pick up any new active WU after the plan-mode mutation below.

## Compute revision number

Count lines in the target state file matching `^## Revision \d+\b` (e.g., `grep -cE '^## Revision [0-9]+\b' .claude/plan-anchor/$1.md`). Let `N = count + 1`. This is the revision number being created.

If `N >= 3`, prepare the warning string verbatim:

```
Revision N — consider whether this work warrants a new task (`/plan-anchor:start`).
```

The warning is printed in stdout AND embedded in the new entry. Replace `N` with the actual number.

## Plan mode

The revision contract is captured in plan mode — same approval surface as `/plan-anchor:start`. No separate intake turn; the plan-mode submission is the single review point.

1. **Enter plan mode** with `EnterPlanMode`. Re-read the state file's Mission, Acceptance Criteria, and Work Units sections so the draft is grounded in what's already done. Read any code paths cited by completed WU evidence to refresh the post-completion baseline.

2. **Draft the revision contract** in this exact order. If `N >= 3`, prepend the warning to the draft so the user sees it before accepting.

   ```
   Revision N for task "<task>" (slug: <slug>)

   > Drafted from your revise prompt + the existing state file.
   > **Please review and correct as needed before accepting.**

   ## Reason *(draft — confirm or correct)*
   <one sentence: why is this revision needed? — a follow-on tweak, an AC
   that was too narrow, a bug discovered post-completion, etc.>

   ## New Acceptance Criteria *(draft — confirm or correct)*
   - **AC<next>** — <observable condition>
   - <0–N items; if the revision only adds WUs to deliver existing ACs
     more completely, write `_None._`>

   ## Modified Acceptance Criteria *(draft — confirm or correct)*
   - **AC<id>** — <new wording>; checkbox will reset to `[ ]` and prior
     evidence will be cleared. The next /plan-anchor:done will gate this.
   - <0–N items; if none, write `_None._`>

   ## New Work Units *(draft — confirm or correct)*
   - **WU-<next>** — <short goal>
     - Serves: AC<...>
     - Scope: <files / modules>
     - Done when:
       - <condition>
     - Verification: <checks>
   - <1–N items; revisions must add at least one WU — otherwise there's
     nothing for governance to anchor>

   ---

   ## Approach
   <1–2 sentences on how this revision layers on top of the existing work>

   ## Phases
   <ordered phases for the revision WUs>

   ## Verification strategy
   <how each new/modified AC will be checked, referencing AC ids>

   ## Drift guardrails
   <constraints to preserve from the original Plan + any new ones>
   ```

3. **Submit via `ExitPlanMode`** for user approval. Iterate on Reason / ACs / WUs / Approach / Phases / Verification until accepted. The slug does not change — revisions live in the same state file.

4. **Capture the approved submission verbatim.** Drop the `(draft — confirm or correct)` markers; the contract is now part of the canonical state file.

## Apply state-file mutation

Update `.claude/plan-anchor/$1.md` with `Edit` (exact-string anchors; never `replace_all`). One anchor per change; expand context if an anchor isn't unique.

1. **Frontmatter (conditional on prior status):**
   - If prior status was `complete`: flip `status: complete` → `status: active`, retarget `active_wu` to the first new WU's id, bump `updated`.
   - If prior status was `active` or `blocked`: leave `status` and `active_wu` unchanged — the existing active or blocked WU is **not** preempted by this revision. Bump `updated` only.
   - `updated:` is always set to the current ISO 8601 UTC (`date -u +"%Y-%m-%dT%H:%M:%SZ"`).

2. **Acceptance Criteria block:**
   - **New ACs:** append `- [ ] **AC<id>** — <text>` to the end of the `# Acceptance Criteria` section. Numbering continues from the highest existing AC id.
   - **Modified ACs:** rewrite the existing AC line so checkbox is `[ ]` and text is the new wording. Drop any inline evidence suffix on that line. The next `/plan-anchor:done` will require new evidence.

3. **Work Units block (conditional on prior status):**
   - WU numbering: `<first new> = max(existing WU-N) + 1`. Append each new WU under the `# Work Units` section.
   - If prior status was `complete` (no existing active WU): the first new WU's heading is `## WU-<id> — <goal> — active`; the rest are `## WU-<id> — <goal> — pending`.
   - If prior status was `active` or `blocked`: every new WU is `## WU-<id> — <goal> — pending` — the existing active/blocked WU keeps its slot.
   - Body shape per WU follows the standard template: `- Serves`, `- Scope`, `- Done when` (with `[ ]` items), `- Verification`, `- Evidence:`, `- Risks:`. Pre-existing WUs are never modified.

4. **Revisions section:**
   - If `# Revisions` is absent, append it after `# Handoff` with the HTML comment from `state/template.md` and the `_None._` placeholder.
   - If `_None._` is present, remove it.
   - Append:

     ```
     ## Revision N — <ISO 8601 UTC>

     - Reason: <reason text>
     - New ACs: <AC ids comma-separated, or `_none_`>
     - Modified ACs: <AC<id> — short note, comma-separated, or `_none_`>
     - New WUs: <WU ids comma-separated>
     - Warning: <warning string — omit this line entirely when N < 3>
     ```

5. **Handoff section:** refresh manually so the file is resume-ready immediately (active WU, files touched, smallest next action). The `pre_compact` and `stop` hooks will continue to refresh it on subsequent turns.

## Mirror Tasks

For each new revision WU, call `TaskCreate`:

- `subject`: `[<slug>] WU-<id>: <one-line goal>` — same convention as `/plan-anchor:start` so `/plan-anchor:status` and `/plan-anchor:done` continue to find them.
- `description`: copy the WU body (Done-when + Verification).
- `activeForm`: `Working on WU-<id>: <goal>`.

If the first new WU was set `active` (prior status was `complete`), call `TaskUpdate` on its Task with `status: in_progress`. If all new WUs are `pending` (prior status was `active` or `blocked`), do **not** call `TaskUpdate` — the existing active WU's Task is already `in_progress` and stays that way; pending Tasks correctly reflect that the new WUs are queued. Do **not** modify any pre-existing Tasks (completed, in_progress, or pending) — the harness UI shows original WUs as their existing history.

## Confirm + continue

Print the confirmation. If `N >= 3`, prepend the warning line. The `Active` and `Next` lines name the **resulting** active WU — the first new WU when prior status was `complete`, the previously-active WU otherwise:

```
[Revision N warning] Revision N — consider whether this work warrants a new task (/plan-anchor:start).
Revised Plan Anchor task: <task> (slug: <slug>) — revision N applied.
State: .claude/plan-anchor/<slug>.md
Active: WU-<id> — <goal>          # first new WU if prior status was complete; existing active WU otherwise
Next: <first unchecked Done-when of the resulting active WU>
```

Then continue in the same turn: read the resulting active WU's first unchecked `Done when` item and begin work on it. The user just approved the revision contract — no extra prompt needed. The `pre_edit` hook gates scope to the resulting active WU on the first edit.

When prior status was `active` or `blocked`, the new revision WUs sit in the `pending` queue. They pick up after the existing active WU completes; the user can promote one earlier by editing the state file directly if needed.

## Rules

- **Additive only.** Each revise call appends a new `## Revision N` block; never delete or rewrite earlier ones. Modifying ACs is allowed (it's a rewrite of the AC line + evidence reset), but the Revision block that records the change is append-only.
- **No edits to other commands or hooks.** Revise lives entirely in the state file. If implementation seems to need a change to `hooks/lib/state.js` or any other command, stop — that's drift relative to the approved plan, and should be recorded in the Drift Log instead.
- **Soft 2 KB cap on the state file.** Keep each `## Revision N` block to ~3-5 lines. AC/WU details belong in their canonical sections, not in the revision entry.
- **No secrets** in revision entries. Same rule as the rest of the state file.
- **Accept any task status (`complete | active | blocked`); refuse only when frontmatter is unparseable or `status` is missing.** On `complete`, the task is re-attached and the first new WU becomes active. On `active`, the existing active WU is preserved and new WUs queue as `pending`. On `blocked`, status remains `blocked` — revise can stage replacement work but does not auto-unblock; the user resolves the blocker themselves. Never silently change `active_wu` when an active or blocked WU is already in flight.
- **The 3rd-revision warning is soft.** It informs; it never refuses. If the user genuinely wants a 4th, 5th, or Nth revision, the command performs it. The signal is its own enforcement mechanism.
