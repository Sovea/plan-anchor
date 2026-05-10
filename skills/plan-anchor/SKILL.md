---
name: plan-anchor
description: This skill should be used when the user asks to "use Plan Anchor", "anchor this implementation", "keep this task anchored", "govern this implementation", "use execution governance", "prevent plan drift", "keep this complex task on track", "avoid local fix loops", "resume from handoff", "manage a multi-step coding task", or discusses execution drift, checkpointing, phase gates, resumable implementation, or quality governance for complex Claude Code coding work.
version: 0.0.1
---

# Plan Anchor

Keep complex coding tasks anchored to the original mission, plan, acceptance criteria, and delivery path. Use the execution governance protocol to prevent plan drift, local-fix loops, context-loss failures, and premature completion claims.

Plan Anchor governs execution inside Claude Code by default. It is not a persistent project state manager unless the user explicitly opts in to durable state.

## Apply When

Apply this skill when the task involves any of the following:

- Multi-file or multi-phase implementation.
- Architecture-sensitive feature work, refactoring, migration, or bug fixing.
- Work likely to continue across multiple turns or context compaction.
- Explicit concern about plan drift, execution quality, stalled progress, or repeated small fixes.
- Requests to resume from a prior handoff or continue a governed task.

Skip this skill for trivial edits, one-line fixes, or purely informational answers unless the user explicitly requests governance.

## Complexity Levels

Use the lightest governance level that can keep the task safe and resumable.

### Level 1: Simple

Use lightweight alignment only. Do not create a Work Unit ledger for trivial, single-step, or single-file changes unless the user requests it.

### Level 2: Governed

Use Mission Contract, Execution Plan, Work Units, Progress Ledger, Verification Matrix, Drift Log, and Handoff State in conversation. Use Claude Code task tracking when there are three or more meaningful Work Units. Do not persist files by default.

### Level 3: Durable

Use governed execution plus an opt-in durable anchor file for long-running, cross-session, high-risk, or multi-agent work. Ask the user before creating or updating any Plan Anchor state file.

## Persistence Policy

By default, do not create or modify files for Plan Anchor state. Maintain governance state in conversation context, plan mode, task tracking, and handoff messages.

Ask before persisting when any of the following apply:

- The task is likely to span sessions or days.
- The user asks for resumability beyond the current conversation.
- The task has many Work Units or high context-loss risk.
- Multiple agents or handoffs are expected.

If the user approves durable state, persist a single anchor file at `.claude/plan-anchor/<task-slug>.md` unless they choose another path. Do not write Plan Anchor state to the project root, scatter multiple state files, or commit the anchor file unless explicitly requested.

## Non-Persistent State Discipline

When durable state is not enabled:

- Keep the active Work Unit visible before implementation.
- Use Claude Code task tracking for tasks with three or more meaningful Work Units.
- After each Work Unit, update completed work, acceptance criteria status, verification result, drift status, and the next active Work Unit.
- Before long pauses, context compaction, task switching, or unfinished stops, produce Handoff State that is sufficient for a fresh Claude instance to resume without reading the full conversation.

## Core Operating Principles

1. Anchor every action to a clear Mission Contract.
2. Make acceptance criteria explicit before implementation.
3. Decompose work into verifiable Work Units.
4. Execute one Work Unit at a time.
5. Verify each Work Unit before marking it complete.
6. Keep a Progress Ledger current enough to resume after interruption.
7. Treat unplanned scope, architecture, or acceptance changes as drift.
8. Stop and reassess after repeated local fixes that do not advance the active Work Unit.
9. Produce Handoff State at meaningful stopping points.
10. Never claim completion with unresolved acceptance criteria, hidden TODOs, skipped verification, or unexplained deviations.

## Lifecycle

### 1. Intake

Establish the Mission Contract before planning or coding. Capture mission, scope, non-goals, constraints, acceptance criteria, risks, and unresolved questions. Load `templates/mission-contract.md` and `checklists/intake.md` when the request is ambiguous or high impact.

If acceptance criteria, constraints, or target behavior are unclear, ask focused clarification questions before implementation.

### 2. Plan

Create or confirm the Execution Plan. Record the target outcome, chosen approach, rejected alternatives, architecture impact, implementation phases, verification strategy, and drift guardrails. Load `templates/execution-plan.md` for substantial tasks.

Use plan mode for non-trivial implementation tasks that need user alignment before code changes. Treat an approved plan as the execution anchor.

If the task is Level 3, ask whether to enable durable state before implementation. If the user declines or does not answer, continue in non-persistent governed mode.

### 3. Decompose

Break the plan into Work Units. Each Work Unit must have an ID, goal, mapped acceptance criteria, expected files or areas, done conditions, verification steps, dependencies, risks, status, and evidence. Load `templates/work-unit.md` for the structure.

Keep Work Units small enough to verify independently. Only one Work Unit may be active at a time. Avoid marking multiple Work Units complete without validation.

### 4. Execute

Before editing code, identify the active Work Unit and confirm it advances the mission. Load `checklists/pre-implementation.md` when starting or resuming implementation.

Implement only the active Work Unit unless a dependency requires a small explicit adjustment. If new information invalidates the plan, pause implementation and record the drift before changing direction.

### 5. Verify

After each Work Unit, verify its done conditions and update the Progress Ledger. Load `checklists/post-work-unit.md`, `templates/progress-ledger.md`, and `templates/verification-matrix.md` as needed.

Run appropriate static checks, tests, build steps, and behavioral verification based on the project context. If verification cannot be run, record why and what remains unverified. If durable state is enabled, update the anchor file after each completed or blocked Work Unit.

### 6. Drift Check

Compare implementation against the Mission Contract, Execution Plan, non-goals, and acceptance criteria. Load `checklists/drift-check.md` after substantial changes, failed verification, plan changes, or before final completion.

Stop and explain when drift changes scope, architecture, user-visible behavior, or acceptance criteria. Continue only when the deviation is justified and visible to the user.

### 7. Local-Fix Loop Control

Trigger the local-fix loop guard after two consecutive attempts that mainly fix secondary errors without completing or materially advancing the active Work Unit. Load `checklists/local-fix-loop.md`.

Re-identify the Work Unit, blocker, root cause category, and smallest next action that advances the mission. Decide whether to continue fixing, replan, ask the user, or stop with handoff.

### 8. Handoff and Recovery

At the end of a substantial turn, before context compaction, or when pausing with unfinished work, produce Handoff State. Load `templates/handoff-state.md`. Before context compaction, also load `checklists/context-compaction.md`.

A Handoff State must be sufficient for a fresh Claude instance to resume without reading the full conversation. If durable state is enabled, update the anchor file before producing the handoff.

When resuming, ask for Handoff State or a durable anchor path if neither is provided. Reconstruct the mission, plan, active Work Unit, completed work, remaining work, blockers, verification status, drift status, and next action. Load `checklists/recovery.md`. Verify that the current repository state still matches the handoff assumptions before editing. If repository state conflicts with the handoff, trust the repository and update the Progress Ledger.

## Required State Objects

Maintain these objects during governed execution:

- **Mission Contract**: mission, scope, non-goals, constraints, acceptance criteria, risks.
- **Execution Plan**: selected approach, implementation phases, verification strategy, drift guardrails.
- **Work Units**: independently verifiable implementation chunks with ID, goal, acceptance mapping, done conditions, verification steps, status, and evidence.
- **Progress Ledger**: current status of acceptance criteria, Work Units, blockers, validation, drift, and next action.
- **Verification Matrix**: checks run, results, evidence, and unverified areas.
- **Drift Log**: deviations from plan, reason, impact, and whether user approval is needed.
- **Handoff State**: resumable state for the next turn or session.

## Guardrails

- Do not begin coding before critical ambiguity is resolved or explicitly accepted as a risk.
- Do not silently alter scope, architecture, API contracts, or acceptance criteria.
- Do not bypass failing checks by deleting tests, weakening validation, or hiding errors.
- Do not introduce broad refactors unless they are part of the approved Work Unit.
- Do not leave partial implementations, TODO-only behavior, or dead paths while claiming completion.
- Do not continue indefinite debugging when the local-fix loop guard has triggered.
- Do not substitute a summary for verification; record concrete checks or explicit gaps.
- Do not create durable Plan Anchor state unless the user explicitly approves it.
- Do not commit durable anchor files unless the user explicitly asks.

## Work Unit Completion Rules

Do not mark a Work Unit complete unless:

- Its done conditions are met.
- Required verification was run or explicitly recorded as not run with a reason.
- Acceptance criteria mapping was updated.
- Drift was checked and recorded.
- The next Work Unit or next action is clear.

## Resume Mode

When the user asks to resume governed work:

1. Ask for Handoff State or a durable anchor path if neither is provided.
2. Reconstruct Mission Contract, Execution Plan, acceptance criteria, completed Work Units, active Work Unit, blockers, verification status, drift status, and next action.
3. Inspect current repository state before editing.
4. Resume from the smallest action that advances the active Work Unit.
5. If the handoff conflicts with the repository, trust the repository and update the ledger.

## Durable Anchor Mode

Enable durable state only after explicit user approval. Use `templates/durable-anchor.md` and write a single file at `.claude/plan-anchor/<task-slug>.md` unless the user chooses another path.

If durable state is enabled:

- Update the anchor after plan approval.
- Update it after each completed or blocked Work Unit.
- Update it before handoff or context compaction.
- Do not store secrets, credentials, tokens, or private external data.
- Do not commit the file unless explicitly requested.

## Resource Map

Load supporting files only when needed:

- `references/governance-protocol.md` — detailed lifecycle rules, phase gates, drift handling, local-fix loop decisions, acceptance mapping, and recovery protocol.
- `templates/mission-contract.md` — intake state object.
- `templates/execution-plan.md` — approved plan anchor.
- `templates/work-unit.md` — decomposed implementation unit.
- `templates/progress-ledger.md` — resumable execution status.
- `templates/verification-matrix.md` — validation tracking.
- `templates/handoff-state.md` — pause/resume state.
- `templates/durable-anchor.md` — opt-in persistent anchor state.
- `checklists/intake.md` — pre-plan clarification checks.
- `checklists/pre-implementation.md` — before-code alignment checks.
- `checklists/post-work-unit.md` — after-unit completion checks.
- `checklists/drift-check.md` — drift and scope control checks.
- `checklists/local-fix-loop.md` — stalled debugging reassessment.
- `checklists/pre-completion.md` — final completion gate.
- `checklists/context-compaction.md` — pre-compaction state preservation checks.
- `checklists/recovery.md` — resume-from-handoff checks.
- `examples/governed-feature-task.md` — compact example of the protocol in use.

## Completion Standard

Claim the governed task complete only when all acceptance criteria are satisfied or explicitly marked out of scope, required verification has passed or gaps are disclosed, drift has been resolved or approved, and the final response identifies what changed and what remains. If any item is unfinished, provide Handoff State instead of a completion claim.
