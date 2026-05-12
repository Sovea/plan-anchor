---
description: Check whether recent work has drifted from the Plan, Acceptance Criteria, or Non-Goals. Runs detection in an isolated subagent. On material drift, re-enters plan mode for a user-approved revision.
allowed-tools: [Read, Edit, Bash, Agent, EnterPlanMode, ExitPlanMode]
---

Run a drift check against the current Plan Anchor task. Enforces guardrail **G4** in `skills/plan-anchor/references/guardrails.md`.

## Resolve the current task

1. Read `.claude/plan-anchor/current.txt`. If missing/empty, output `No active task` and stop.
2. Read `.claude/plan-anchor/<slug>.md`.

## Detect drift in an Explore subagent

Delegate the noisy part — `git status`, `git diff`, `git log`, file reads — to an Explore-type subagent so the main conversation isn't flooded by diff output on a large repo.

Call the `Agent` tool with:

- `subagent_type`: `Explore` (read-only).
- `description`: `Plan Anchor drift detection`.
- `prompt`: a self-contained task spec that includes:
  - The full text of the state file's Mission, Plan, Non-Goals, Drift Guardrails, Acceptance Criteria, and Work Units sections (paste verbatim).
  - Instructions to gather: `git status --short`, `git diff --stat`, `git log --oneline -20`, and read any modified files cited by `git status`.
  - Instructions to compare changes against six dimensions:
    1. **Scope** — files modified outside the active WU's `Scope`.
    2. **Non-Goals** — anything implemented that's listed under Non-Goals.
    3. **Drift Guardrails** — constraints from `Plan.Drift guardrails` that have been violated.
    4. **Acceptance Criteria** — any AC dropped, weakened, or silently redefined.
    5. **Architecture / API / Data model** — module boundary, public API, persisted shape, or user-visible behavior changes not described in `Plan.Approach`.
    6. **Verification Strategy** — has the strategy been replaced with something weaker (tests removed, assertions softened, "verified by inspection" instead of unit tests)?
  - Instructions to return a structured findings list with one row per finding: `{deviation, reason, impact, severity: 'minor' | 'material', dimension}`. Empty list when clean. Cap output at ~400 words.

## Classify and act on findings

Once the subagent returns:

- **No findings** → output `Drift check: clean.` and stop. Do not modify the state file.
- **Only minor findings** (no row has `severity: material`) → append each row to the Drift Log in `.claude/plan-anchor/<slug>.md` with `status: resolved` and a one-line summary, then continue.
- **One or more material findings** → see the next section.

## Material drift → plan mode replan

This is the path that replaces the old "stop and ask the user open-endedly" behavior. The harness has a built-in plan-approval UX (plan mode); use it.

1. Append each material finding to the Drift Log with `status: open` so the deviation is recorded before any plan revision.
2. **Enter plan mode** with `EnterPlanMode`. Inside plan mode, draft a revised plan that explicitly accommodates the material drift. The draft must:
   - Quote the original `Plan.Approach` and call out exactly what changes.
   - Restate `Drift guardrails`, adding any new constraints learned from the deviation.
   - List the open drift rows with the proposed disposition: `approve` (accept the deviation, update plan), `revert` (the user will undo), or `replan` (the deviation is symptom of a deeper redesign).
3. **Submit via `ExitPlanMode`** for user approval. Iterate if rejected.
4. Once approved:
   - Replace the entire `# Plan` section in `.claude/plan-anchor/<slug>.md` with the approved revision.
   - For each open drift row covered by the approved plan, set `status: approved`.
   - For any drift the user explicitly chose to revert, set `status: rejected` and guide them through the undo (`git restore`, etc.) — but do not perform the undo without explicit confirmation per file.
5. Bump frontmatter `updated:` to the current ISO 8601 UTC timestamp.

Do not take implementation action in the same turn as a material drift finding. Replanning is the only mainline action `/plan-anchor:drift` may take.

## Drift Log format

```
# Drift Log

| Deviation | Reason | Impact | Approval? | Status |
| --- | --- | --- | --- | --- |
| <one-line> | <reason> | <impact> | yes/no | open |
```

Keep `_None._` only when the list is truly empty.

## Output

Print a summary line:

```
Drift check: <clean | N minor | N material>
<if any> Added <N> row(s) to Drift Log.
<if material> Re-entered plan mode for revision; new plan <approved|rejected|pending>.
```
