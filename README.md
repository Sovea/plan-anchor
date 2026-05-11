# Plan Anchor

Plan Anchor is a Claude Code skill-focused plugin for complex AI coding tasks. It keeps implementation anchored to the original mission, plan, acceptance criteria, verification path, and handoff state.

Plan Anchor is intentionally non-persistent by default. It governs execution inside the current Claude Code session unless the user explicitly opts in to a durable anchor file.

## What It Provides

- One main skill: `plan-anchor`
- Mission contracts, execution plans, Work Units, progress ledgers, verification matrices, drift logs, and handoff state
- Non-persistent governed execution for complex tasks without modifying project files
- Optional durable anchor mode for cross-session or long-running work
- Checklists for intake, pre-implementation, post-work-unit review, drift checks, local-fix loop recovery, context compaction, pre-completion validation, and task recovery
- A detailed execution governance protocol reference
- Examples for lightweight, governed, and resume workflows

## Quick Start

Install from the marketplace:

```sh
/plugin marketplace add sovea/cc-marketplace
/plugin install plan-anchor@sovea
```

Then ask Claude Code to use it explicitly:

```text
Use Plan Anchor for this refactor. Keep the work anchored and produce a handoff if we stop before completion.
```

## When To Use It

Use this plugin for Claude Code tasks that involve:

- Multi-file or multi-phase implementation
- Architecture-sensitive feature work, refactoring, migration, or bug fixing
- Work likely to continue across multiple turns or context compaction
- Concern about plan drift, stalled progress, or repeated small fixes
- Resuming from a prior handoff

Use explicit trigger phrases:

- "use Plan Anchor"
- "anchor this implementation"
- "govern this implementation"
- "keep this task anchored"
- "use execution governance"
- "prevent plan drift"
- "keep this complex task on track"
- "avoid local fix loops"
- "resume from handoff"

## When Not To Use It

Skip Plan Anchor for:

- One-line fixes.
- Routine explanations or code reading.
- Simple single-file edits with obvious verification.
- Exploratory brainstorming where no implementation is starting yet.

## Execution Modes

### Level 1: Simple

Lightweight alignment for small but non-trivial tasks. Claude restates the mission, acceptance criteria, and verification, but does not create a Work Unit ledger.

### Level 2: Governed

Default for complex work. Claude keeps state in the conversation, task tracking, and handoff messages. It does not create or modify files for Plan Anchor state.

### Level 3: Durable

For long-running, cross-session, high-risk, or multi-agent tasks, Plan Anchor can create a durable anchor file only after explicit user approval.

Recommended path:

```text
.claude/plan-anchor/<task-slug>.md
```

The durable anchor stores the mission contract, execution plan, Work Units, progress ledger, verification matrix, drift log, handoff state, and next action. It should not contain secrets, credentials, tokens, or private external data.

Durable anchor files should normally be excluded from version control unless the user explicitly asks to commit them.

## Resume Workflow

When resuming governed work:

1. Provide the previous Handoff State or durable anchor path.
2. Plan Anchor reconstructs the mission, acceptance criteria, completed Work Units, active Work Unit, blockers, verification status, drift status, and next action.
3. Claude checks the current repository state before editing.
4. If the repository conflicts with the handoff, the repository is treated as authoritative.
5. Work resumes from the smallest next action that advances the active Work Unit.

## Example Output Shape

For governed work, Plan Anchor should produce compact state like this before implementation:

```md
Mission: Add saved filters to the issue list without changing existing query semantics.

Acceptance:
- AC1: A user can save the current filter set with a name.
- AC2: Saved filters appear in the sidebar.
- AC3: Selecting a saved filter applies the stored query.

Active Work Unit: WU-1, persist saved filters.
Verification: model/unit tests for save/list behavior, then behavioral check of the issue list flow.
Drift Guardrail: Do not add sharing or editing in this pass.
```

See `skills/plan-anchor/examples/` for fuller examples.

## License

MIT
