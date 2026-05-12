---
description: Check whether recent work has drifted from the Plan, Acceptance Criteria, or Non-Goals. Updates the Drift Log and pauses for user confirmation on material drift.
allowed-tools: [Read, Edit, Bash]
---

Run a drift check against the current Plan Anchor task. Enforces guardrail **G4** in `skills/plan-anchor/references/guardrails.md`.

## Resolve the current task

1. Read `.claude/plan-anchor/current.txt`. If missing/empty, output "No active task" and stop.
2. Read `.claude/plan-anchor/<slug>.md`.

## Inspect recent work

Collect the evidence for drift:

- Run `git status --short` and `git diff --stat` to see modified files.
- Run `git log --oneline -20` to see recent commits on this branch.
- Read the Work Unit status in the state file — which WUs have been touched since the plan was written.

## Compare against the plan

Check each of these dimensions. For each, classify as **aligned**, **minor deviation**, or **material drift**:

1. **Scope** — are all modified files within the active WU's `Scope`? Files touched outside any WU's scope are drift.
2. **Non-Goals** — does any change implement something listed under `Non-Goals`?
3. **Drift Guardrails** — are any constraints from `Plan.Drift guardrails` violated?
4. **Acceptance Criteria** — has any AC been dropped, weakened, or silently redefined?
5. **Architecture / API / Data model** — do the changes alter module boundaries, public APIs, persisted shapes, or user-visible behavior in ways not described in `Plan.Approach`?
6. **Verification Strategy** — has the strategy been replaced with something weaker (e.g., tests removed, assertions softened, "verified by inspection" substituted for "unit tests")?

For each finding, note:
- **Deviation**: one line, concrete.
- **Reason**: why it happened (or "unknown — ask user").
- **Impact**: scope / behavior / timeline / risk.
- **User approval needed**: yes/no — yes when impact touches scope, architecture, observable behavior, or acceptance.
- **Status**: `open` initially.

## Decide action

Compute the most severe finding:

- **No findings** → output `Drift check: clean.` and stop. Do not modify the state file.
- **Only minor deviations** (naming tweaks, internal helper extractions, etc., that don't touch the six dimensions above) → record in the Drift Log with `status: resolved` and one-line summary; continue.
- **Material drift** → append each row to the Drift Log with `status: open`. Stop and ask the user one consolidated question: list all open drift rows, ask whether to approve (mark `approved`), reject and revert (guide the user through undo), or replan. Do not continue implementation until the user responds.

## Update the state file

Use Edit to modify the Drift Log section of `.claude/plan-anchor/<slug>.md`. The rendering format:

```
# Drift Log

| Deviation | Reason | Impact | Approval? | Status |
| --- | --- | --- | --- | --- |
| <one-line> | <reason> | <impact> | yes/no | open |
```

Keep `_None._` only when the list is truly empty.

## Output

Print a summary:

```
Drift check: <clean | N minor | N material>
<if any> Added <N> row(s) to Drift Log.
<if material> Paused for user approval on <N> open row(s).
```

Do not take implementation action in the same turn as a material drift finding.
