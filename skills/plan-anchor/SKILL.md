---
name: plan-anchor
description: Use only when the user explicitly asks to "use Plan Anchor", "anchor this implementation", "govern this implementation", "use execution governance", "prevent plan drift", "avoid local fix loops", "resume from handoff", or when a high-risk coding task clearly needs resumable execution governance, drift control, or handoff recovery.
version: 0.0.1
---

# Plan Anchor

Keep complex coding tasks anchored to the original mission, execution plan, acceptance criteria, verification path, and handoff state. Plan Anchor is non-persistent by default; create durable state only after explicit user approval.

## Trigger Discipline

Use this skill when:

- The user explicitly asks to use Plan Anchor or execution governance.
- The task is multi-file, multi-phase, architecture-sensitive, or likely to span turns.
- The user is concerned about plan drift, repeated local fixes, resumability, or handoff recovery.
- The user asks to resume from a prior Handoff State or durable anchor.

Do not apply this skill just because a task has more than one step. Skip it for trivial edits, one-line fixes, routine explanations, and exploratory brainstorming unless the user explicitly requests governance.

## Choose The Lightest Level

### Level 1: Simple

Use for small but non-trivial tasks. Restate the mission, acceptance criteria, and verification path. Do not create a Work Unit ledger unless the user asks.

### Level 2: Governed

Use for substantial implementation. Keep the Mission Contract, Execution Plan, Work Units, Progress Ledger, Verification Matrix, Drift Log, and Handoff State in conversation. Use Claude Code task tracking when there are three or more meaningful Work Units.

### Level 3: Durable

Use Level 2 plus a durable anchor file only for long-running, cross-session, high-risk, or multi-agent work. Ask before creating or updating any Plan Anchor state file.

## Core Flow

1. **Intake**: Establish mission, scope, non-goals, constraints, acceptance criteria, risks, and unresolved questions. Load `templates/mission-contract.md` and `checklists/intake.md` when ambiguity could change the implementation.
2. **Plan**: Confirm the approach, architecture impact, phases, verification strategy, and drift guardrails. Load `templates/execution-plan.md` for substantial tasks.
3. **Decompose**: Break the plan into independently verifiable Work Units. Load `templates/work-unit.md` when Work Units are needed.
4. **Execute**: Before editing, name the active Work Unit and confirm it advances the mission. Load `checklists/pre-implementation.md` when starting or resuming implementation.
5. **Verify**: After each Work Unit, check done conditions, run or record verification, and update state. Load `checklists/post-work-unit.md`, `templates/progress-ledger.md`, and `templates/verification-matrix.md` as needed.
6. **Drift Check**: Compare the work against the Mission Contract, Execution Plan, non-goals, and acceptance criteria. Load `checklists/drift-check.md` after substantial changes, failed verification, plan changes, or before completion.
7. **Loop Control**: After two consecutive secondary fixes that do not complete or materially advance the active Work Unit, load `checklists/local-fix-loop.md` and choose whether to continue, replan, ask the user, or hand off.
8. **Handoff/Recovery**: Produce Handoff State before pausing unfinished work, context compaction, or task switching. Load `templates/handoff-state.md`, `checklists/context-compaction.md`, or `checklists/recovery.md` as relevant.

Load `references/governance-protocol.md` for detailed phase gates, drift definitions, acceptance mapping, local-fix loop decisions, durable-state rules, and recovery protocol.

## Governed State Rules

For Level 2 and Level 3, maintain:

- **Mission Contract**: mission, scope, non-goals, constraints, acceptance criteria, risks.
- **Execution Plan**: chosen approach, phases, verification strategy, drift guardrails.
- **Work Units**: ID, goal, acceptance mapping, files or areas, done conditions, verification, dependencies, risks, status, evidence.
- **Progress Ledger**: acceptance status, Work Unit status, blockers, validation, drift, next action.
- **Verification Matrix**: checks run, results, evidence, remaining gaps.
- **Drift Log**: deviation, reason, impact, user approval need, status.
- **Handoff State**: resumable state for another turn or session.

Only one Work Unit may be active at a time. Do not mark a Work Unit complete unless done conditions are met, verification is run or explicitly recorded as skipped with a reason, acceptance status is updated, drift is checked, and the next action is clear.

## Mandatory Guardrails

- Do not begin coding before critical ambiguity is resolved or explicitly accepted as a risk.
- Do not silently alter scope, architecture, API contracts, data models, user-visible behavior, or acceptance criteria.
- Do not bypass failing checks by deleting tests, weakening validation, or hiding errors.
- Do not introduce broad refactors unless they are part of the active Work Unit.
- Do not leave partial implementations, TODO-only behavior, or dead paths while claiming completion.
- Do not continue indefinite debugging after the local-fix loop guard triggers.
- Do not substitute a summary for verification; record concrete checks or explicit gaps.
- Do not create, update, or commit durable Plan Anchor state unless the user explicitly approves it.

## Durable Anchor Mode

Enable durable state only after explicit user approval. Use `templates/durable-anchor.md` and write one file at `.claude/plan-anchor/<task-slug>.md` unless the user chooses another path.

If enabled, update the anchor after plan approval, after each completed or blocked Work Unit, and before handoff or context compaction. Do not store secrets, credentials, tokens, or private external data. Suggest excluding `.claude/plan-anchor/*.md` from version control unless the user explicitly wants anchors committed.

## Resume Mode

When resuming governed work, ask for Handoff State or a durable anchor path if neither is provided. Reconstruct the mission, plan, acceptance criteria, completed Work Units, active or next Work Unit, blockers, verification gaps, drift status, and next action. Inspect current repository state before editing; if repository state conflicts with the handoff, trust the repository and update the Progress Ledger.

## Completion Standard

Claim completion only when all acceptance criteria are satisfied or explicitly out of scope, required verification has passed or gaps are disclosed, drift is empty/resolved/approved, and no partial work remains. If anything is unfinished, provide Handoff State instead of a completion claim.

## Resource Map

Load supporting files only when needed:

- `references/governance-protocol.md` - detailed lifecycle rules, phase gates, drift handling, local-fix loop decisions, acceptance mapping, and recovery protocol.
- `templates/mission-contract.md` - intake state object.
- `templates/execution-plan.md` - approved plan anchor.
- `templates/work-unit.md` - decomposed implementation unit.
- `templates/progress-ledger.md` - resumable execution status.
- `templates/verification-matrix.md` - validation tracking.
- `templates/handoff-state.md` - pause/resume state.
- `templates/durable-anchor.md` - opt-in persistent anchor state.
- `checklists/intake.md` - pre-plan clarification checks.
- `checklists/pre-implementation.md` - before-code alignment checks.
- `checklists/post-work-unit.md` - after-unit completion checks.
- `checklists/drift-check.md` - drift and scope control checks.
- `checklists/local-fix-loop.md` - stalled debugging reassessment.
- `checklists/pre-completion.md` - final completion gate.
- `checklists/context-compaction.md` - pre-compaction state preservation checks.
- `checklists/recovery.md` - resume-from-handoff checks.
- `examples/lightweight-single-file-task.md` - Level 1 lightweight alignment example.
- `examples/governed-feature-task.md` - Level 2 governed feature example.
- `examples/resume-from-handoff.md` - resume workflow example.
