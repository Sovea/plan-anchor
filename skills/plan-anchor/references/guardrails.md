# Plan Anchor Guardrails

Five hard rules. Each one exists because it prevents a specific, recurring failure mode in long Claude Code tasks. Do not add more rules without a documented failure the new rule would have caught.

---

## G1 — Active Work Unit required before editing

Before any `Edit`, `Write`, or `MultiEdit`, the state file must have exactly one Work Unit with `status: active`, and the file being edited should fall within that Work Unit's declared scope.

**Prevents.** Editing whatever looks interesting next, losing the thread of the current Work Unit, and quiet scope creep disguised as "while I'm here" changes.

**Enforced by.** `hooks/pre_edit.js` (blocks the tool call when no active WU or when the target path is outside the WU scope). The hook's block reason tells the agent how to recover (either switch the active WU or record drift).

---

## G2 — Local-fix loop breaker

After two consecutive tool-use turns that primarily address secondary failures (typecheck, lint, unrelated test flakiness, build warnings) without making measurable progress on the active Work Unit's `Done when` list, stop and classify the blocker before continuing.

Classify as one of:

- **Incidental** — narrow, clear fix that preserves the plan.
- **Structural** — design or architecture mismatch that requires replan.
- **Requirement gap** — product decision the user must make.
- **Environmental** — tooling, dependency, or external service issue.

Then pick exactly one action: **continue with a bounded fix**, **replan**, **ask the user**, or **handoff**.

**Prevents.** Runaway debugging loops that churn the repo without advancing the Work Unit — the classic "fix the test to make it pass" failure mode that quietly weakens coverage.

**Enforced by.** `hooks/post_edit.js` maintains a small counter in the state file; when the counter crosses 2, it injects a block-and-classify prompt through `hooks/user_prompt.js` on the next turn.

---

## G3 — Evidence-gated completion

A Work Unit may only transition to `complete` when every `Done when` checkbox is checked **and** `Evidence` has at least one concrete line (command output, file diff ref, test id, screenshot, etc.).

A task may only be marked `status: complete` in the state file when every acceptance criterion has a non-empty evidence field pointing back at the Work Units that delivered it.

**Prevents.** "Implementation looks right, ship it" false completions — the most common way agents declare victory while verification is silently missing.

**Enforced by.** `/anchor:done` refuses to mark the task complete if any AC lacks evidence; `hooks/stop.js` warns when the final agent message claims completion but the state file disagrees.

---

## G4 — Drift requires explicit entry + user confirmation

Any change to scope, architecture, API contract, data model, user-visible behavior, or the chosen verification strategy must be recorded as a Drift Log row **before** the change is implemented. If the drift affects scope, timeline, risk, or behavior the user can observe, ask the user before proceeding.

Opportunistic refactors, "cleanup while here", and replacing the approved approach with a materially different one all count as drift.

**Prevents.** Silent scope / architecture creep, the second-most-common failure mode in long tasks. Forces the agent to name the deviation and, where it matters, stop for confirmation.

**Enforced by.** `/anchor:drift` runs a drift check; the `hooks/user_prompt.js` injection includes the Drift Log's open rows in every turn so the agent can't forget them.

---

## G5 — Verification = what actually ran

The Verification section records only checks that were actually executed, with evidence. Planned-but-not-run checks stay at `not_run`. "Verified" is never a synonym for "it looks right."

If a check cannot be run in this environment, record it as `blocked` with the reason, not `passed`.

**Prevents.** Summary-as-substitute-for-verification — the agent saying "I've confirmed the behavior" when nothing ran. Also prevents the anti-pattern of weakening an assertion so the suite reports green.

**Enforced by.** `/anchor:done` diffs the Verification table against Claude's message for the pattern "verified / tested / confirmed" and flags mismatches.

---

## What is NOT a guardrail

The following were considered and deliberately left out. They are either too weak to enforce, or produce more noise than signal:

- Mandatory 5-layer verification matrix (many tasks legitimately use 1–2 layers).
- `enabling_work_reason` field on every Work Unit (mostly blank in practice).
- Rejected-alternatives list on every plan (busywork when the approach is obvious).
- Separate `clarifying_questions` phase gate (Intake already covers this).

If experience shows one of these *does* prevent a real failure, promote it via the same template: one rule, one failure it catches, one enforcer.
