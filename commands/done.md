---
description: Completion gate. Refuses to mark the task complete unless every AC has evidence, every WU is complete with evidence, all declared verification passed, and no drift is open.
allowed-tools: [Read, Edit, Bash]
---

Run the completion gate for the current Plan Anchor task. Enforces guardrails **G3** (evidence-gated completion) and **G5** (verification = what actually ran) from `skills/plan-anchor/references/guardrails.md`.

## Resolve the current task

1. Read `.claude/plan-anchor/current.txt`. If missing/empty, output "No active task" and stop.
2. Read `.claude/plan-anchor/<slug>.md`.

## Gate checks

Run all checks and collect failures. Do **not** short-circuit — the user should see the full list on first run.

### C1 — Acceptance criteria

For each AC:

- Must be rendered with `[x]` (not `[ ]`).
- Must have a non-empty evidence line (either inline after the AC or in a separate evidence reference).
- Evidence must point at concrete work: a WU id, a commit, a file, a test id, a command output. "Done" / "looks good" / "verified by inspection" are insufficient.

Failures go into a list as `AC<N>: <reason>`.

### C2 — Work Units

For each WU:

- `status` must be `complete` (or the WU must be explicitly deferred with a one-line reason in its body).
- `Evidence:` field must be non-empty and concrete (same rules as C1).
- Every `Done when` checkbox must be `[x]`.

Failures go in as `WU-N: <reason>`.

### C3 — Verification

For each row in the Verification table:

- If `status` is `passed`, `evidence` column must be non-empty.
- If `status` is `not_run` and the layer is referenced by any `Plan.Verification strategy` bullet, mark as failure — something planned was never run.
- If `status` is `blocked` or `skipped`, the `evidence` column must explain why (environment constraint, intentional skip with reason).

Failures: `Verification.<layer>: <reason>`.

### C4 — Drift

The Drift Log must contain zero rows with `status: open`. `resolved`, `approved`, `rejected` are OK.

Failures: `Drift row N is open — resolve, approve, or reject first.`

### C5 — Sanity checks on the repo

Run:

```bash
git status --short
```

- If the worktree is modified, warn but do not fail: list the modified files and ask the user whether this is expected for completion (some tasks legitimately leave generated or untracked files).
- Grep the state file for `TODO` / `FIXME` / `XXX` strings; fail if any are found in the body (frontmatter comments are fine).

Failure (hard): `State file contains TODO/FIXME markers at lines: <lines>`.

## Output

### If any failure

Print:

```
/plan-anchor:done — NOT COMPLETE. <N> check(s) failed:

  <failure 1>
  <failure 2>
  ...

State file: .claude/plan-anchor/<slug>.md
Fix the items above and re-run /plan-anchor:done.
```

Do **not** modify the state file. Do not claim the task is done in prose.

### If all pass

Update the state file:

1. Set frontmatter `status: complete`.
2. Bump `updated:` to current ISO 8601 UTC.
3. Rewrite the `# Handoff` section to a short completion summary instead of a resume package:

   ```
   # Handoff

   Task complete on <updated>. All acceptance criteria satisfied with evidence:
   - AC1: <one-line evidence>
   - AC2: <one-line evidence>
   ...
   ```

Then print:

```
/plan-anchor:done — COMPLETE.
Task: <task> (slug: <slug>)
Acceptance criteria: <N>/<N> with evidence.
Work Units: <N> complete.
Verification: <summary of passed layers>.
Drift: <none | N resolved | N approved>.
State: .claude/plan-anchor/<slug>.md
```

Leave `current.txt` as-is. The user can `/plan-anchor:start` a new task or `/plan-anchor:switch` to another when ready.

## Rules

- Never edit the repo to make the gate pass (e.g., don't retroactively add evidence lines the user hasn't confirmed).
- Never weaken a check to pass the gate. If something is genuinely untestable in this environment, the user records `blocked` with a reason; that is an acceptable resolution of C3.
- Do not call `/plan-anchor:done` automatically from other commands. It is a user-invoked gate.
