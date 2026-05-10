# Governance Protocol

Use this reference for detailed execution rules when a coding task needs sustained governance beyond the core `SKILL.md` workflow.

Plan Anchor is non-persistent by default. It may use a durable anchor file only after explicit user approval.

## Lifecycle Contract

Governed execution follows this sequence:

1. Establish the Mission Contract.
2. Freeze or confirm the Execution Plan.
3. Decompose the plan into Work Units.
4. Execute one active Work Unit.
5. Verify the Work Unit.
6. Run drift checks.
7. Update the Progress Ledger.
8. Update the durable anchor if durable state is enabled.
9. Continue, replan, ask the user, or produce Handoff State.

Do not skip directly from planning to broad implementation when acceptance criteria or Work Units are unclear.

## Phase Gates

### Intake Gate

Proceed only when the mission, scope, non-goals, constraints, acceptance criteria, and risks are known enough to plan. If a missing item could change the solution, ask the user before implementation.

### Plan Gate

Proceed only when the chosen approach and verification strategy are explicit. For architecture-sensitive or multi-file changes, use plan mode and wait for user approval.

For long-running, cross-session, high-risk, or multi-agent work, ask whether to enable durable state. If the user declines or does not answer, continue without persistence.

### Work Unit Gate

Proceed only when the active Work Unit has an ID, status, goal, acceptance criteria mapping, done conditions, verification steps, and expected evidence. If a Work Unit is too broad to verify independently, split it. Only one Work Unit may be active at a time.

### Completion Gate

Claim completion only when acceptance criteria are satisfied, verification status is recorded, and no unapproved drift or partial work remains.

## Drift Definition

Treat any of the following as drift:

- Changing scope, user-visible behavior, architecture, API contracts, data model, or verification strategy without recording the reason.
- Dropping or weakening an acceptance criterion.
- Adding unrelated refactors or opportunistic cleanup.
- Fixing tests by reducing coverage instead of correcting behavior.
- Replacing the approved approach with a materially different one.
- Continuing implementation after discovering that the original assumptions are false.

Drift can be acceptable when it is explicit, justified, and does not undermine the mission. Stop for user confirmation when drift affects scope, architecture, risk, timeline, or expected behavior.

## Local-Fix Loop Definition

A local-fix loop occurs when two consecutive attempts primarily address secondary failures while the active Work Unit remains incomplete. Examples:

- Repeatedly fixing type, lint, or formatting errors without completing the feature path.
- Chasing test failures caused by unclear design assumptions.
- Expanding changes to satisfy incidental errors outside the Work Unit.
- Re-running checks without a new hypothesis or mainline progress.

When triggered, pause and classify the blocker:

- **Incidental**: narrow failure with clear fix that preserves the plan.
- **Structural**: design or architecture mismatch requiring plan revision.
- **Requirement gap**: missing product or behavior decision requiring user input.
- **Environmental**: tooling, dependency, or external service issue requiring disclosure.

Then choose one action: continue with a bounded fix, replan, ask the user, or hand off.

## Acceptance Criteria Mapping

Map every Work Unit to one or more acceptance criteria. If a Work Unit does not serve an acceptance criterion, justify it as enabling work or remove it. If an acceptance criterion has no Work Unit, add one before implementation proceeds.

Use this mapping to prevent local implementation tasks from replacing the original mission.

## Verification Strategy

Prefer layered verification:

1. Static checks: typecheck, lint, formatting, compile.
2. Automated tests: unit, integration, end-to-end as appropriate.
3. Build checks: production or package build when relevant.
4. Behavioral verification: exercise the actual user path or API behavior.
5. Regression review: inspect adjacent behavior touched by the change.

Record verification gaps. Do not imply verification ran when it did not.

## Persistence Rules

Default to non-persistent governed execution. Keep state in conversation, plan mode, task tracking, progress updates, and handoff messages.

Enable durable state only after explicit user approval. When enabled, use a single `.claude/plan-anchor/<task-slug>.md` anchor unless the user chooses another path. Update it after plan approval, after each completed or blocked Work Unit, and before handoff or context compaction.

Do not write Plan Anchor state to the project root, scatter multiple state files, store secrets or tokens, or commit durable anchor files unless explicitly requested.

## Context Compaction Protocol

Before context compaction, long pauses, or task switching, produce Handoff State that can stand alone. Include the mission, acceptance criteria status, completed Work Units, active Work Unit, remaining work, verification status, drift status, blockers, repository assumptions, durable anchor path if any, and exact next action.

## Recovery Protocol

When resuming from Handoff State or a durable anchor:

1. Ask for Handoff State or a durable anchor path if neither is provided.
2. Restate the original mission and acceptance criteria.
3. Identify completed Work Units and evidence.
4. Identify the active or next Work Unit.
5. Review blockers, risks, verification gaps, and drift log.
6. Verify that the current files still match the handoff assumptions before editing.
7. Continue from the smallest next action that advances the active Work Unit.

If handoff state or durable anchor content conflicts with current repository state, trust the repository and update the Progress Ledger. If durable state is enabled, update the anchor after recovery.

## Decision Rules

Continue implementation when the next step is clear, bounded, and aligned with the active Work Unit.

Replan when the chosen approach no longer satisfies constraints or acceptance criteria.

Ask the user when a decision changes expected behavior, scope, risk, or tradeoffs.

Produce Handoff State when the task is paused, blocked, partially verified, or likely to continue in another turn.
