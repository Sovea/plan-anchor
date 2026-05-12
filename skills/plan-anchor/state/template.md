---
task: [human-readable task name]
slug: [kebab-case-id]
status: active            # active | blocked | complete
created: [ISO 8601]
updated: [ISO 8601]
active_wu: WU-1           # id of the Work Unit currently being executed, or null
---

<!--
This file is the single source of truth for one Plan Anchor task.

- One file per task at `.claude/plan-anchor/<slug>.md`.
- `.claude/plan-anchor/current.txt` holds the slug of the currently active task.
- `.claude/plan-anchor/<slug>.meta.json` is a hook-managed sidecar (recent
  touches, loop counter); never edit it by hand.
- The whole directory is git-ignored via `.claude/plan-anchor/.gitignore`
  (contents: `*`), installed by /plan-anchor:start.
- Hooks read `current.txt` → this file on every edit, prompt, and session start.
- Do not store secrets, credentials, tokens, or unrelated project notes here.
- Keep the file compact (soft cap ~2 KB). Compress completed Work Units to one line.
-->

# Mission

[One sentence: what outcome is this task delivering?]

## Scope

- [In-scope item]

## Non-Goals

- [Explicitly out-of-scope item]

## Constraints

- [Technical, product, time, compatibility, security, or process constraint]

# Acceptance Criteria

- [ ] **AC1** — [Observable condition that must be true]
- [ ] **AC2** — [Observable condition that must be true]

# Plan

- Approach: [1–2 sentence chosen approach]
- Phases: [phase A → phase B → phase C]
- Verification strategy: [how each AC will be checked]
- Drift guardrails: [constraints that must not be violated during execution]

# Work Units

<!--
One active at a time. Status: pending | active | blocked | complete.
A Work Unit that doesn't serve an AC is a code smell — either justify inline or delete.
-->

## WU-1 — [short goal] — active

- Serves: AC1, AC2
- Scope: [files / modules / areas this unit is allowed to touch]
- Done when:
  - [ ] [Concrete completion condition]
  - [ ] [Concrete completion condition]
- Verification: [checks to run]
- Evidence: [filled in as work progresses]
- Risks: [unit-specific risks or blockers]

## WU-2 — [short goal] — pending

- Serves: AC3
- Scope: [files / modules]
- Done when:
  - [ ] [condition]
- Verification: [checks]
- Evidence:
- Risks:

# Verification

<!--
Record only checks that were actually run. "not_run" is allowed and honest;
"passed" without evidence is forbidden. Add layers only when used.
-->

| Layer | Command | Status | Evidence |
| --- | --- | --- | --- |
| static | [typecheck/lint] | not_run | |
| tests | [test cmd] | not_run | |
| behavioral | [path exercised] | not_run | |

# Drift Log

<!--
Leave empty until a real drift happens. Only record here when scope, architecture,
API contract, data model, user-visible behavior, or verification strategy changed
vs. Plan / Acceptance. Empty list is the healthy state.
-->

_None._

# Handoff

<!--
Auto-updated by the pre_compact hook and `/plan-anchor:handoff`. Must be self-sufficient
for a fresh agent to resume without reading conversation history.
-->

- Repository assumptions: branch=[...] worktree=[clean|modified]
- Completed WUs: [WU-id: one-line outcome]
- Active WU: [WU-id — current state — conditions remaining]
- Remaining WUs: [WU-id: goal]
- Files touched: [path — why relevant]
- Open blockers: [or "None"]
- Smallest next action: [exact next step for the resuming agent]
