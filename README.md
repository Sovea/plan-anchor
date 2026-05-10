# Plan Anchor

Plan Anchor is a Claude Code skill-focused plugin that keeps complex AI coding tasks anchored to the original mission, plan, acceptance criteria, and delivery path. It uses an internal execution governance protocol to reduce plan drift, local-fix loops, stalled progress, and context-loss failures.

Plan Anchor does not create persistent state files by default. It governs execution inside the current Claude Code session unless the user explicitly opts in to durable state.

## What It Provides

- One main skill: `plan-anchor`
- Mission contracts, execution plans, Work Units, progress ledgers, verification matrices, drift logs, and handoff state
- Non-persistent governed execution for complex tasks without modifying project files
- Optional durable anchor mode for cross-session or long-running work
- Checklists for intake, pre-implementation, post-work-unit review, drift checks, local-fix loop recovery, context compaction, pre-completion validation, and task recovery
- A detailed execution governance protocol reference
- A compact example of a governed feature task

## When to Use It

Use this plugin for Claude Code tasks that involve:

- Multi-file or multi-phase implementation
- Architecture-sensitive feature work, refactoring, migration, or bug fixing
- Work likely to continue across multiple turns or context compaction
- Concern about plan drift, stalled progress, or repeated small fixes
- Resuming from a prior handoff

Example trigger phrases:

- "use Plan Anchor"
- "anchor this implementation"
- "keep this task anchored"
- "use execution governance"
- "prevent plan drift"
- "keep this complex task on track"
- "avoid local fix loops"
- "resume from handoff"

## Execution Modes

### Default: Governed Session Mode

By default, Plan Anchor keeps state in the conversation, plan mode, Claude Code task tracking, and handoff messages. It does not create or modify files for Plan Anchor state.

Use this mode for most complex coding tasks that can finish within the current session or can be resumed from a pasted handoff.

### Optional: Durable Anchor Mode

For long-running, cross-session, high-risk, or multi-agent tasks, Plan Anchor can create a durable anchor file only after explicit user approval.

Recommended path:

```text
.claude/plan-anchor/<task-slug>.md
```

The durable anchor stores the mission contract, execution plan, Work Units, progress ledger, verification matrix, drift log, handoff state, and next action. It should not contain secrets, credentials, tokens, or private external data.

## Resume Workflow

When resuming governed work:

1. Provide the previous Handoff State or durable anchor path.
2. Plan Anchor reconstructs the mission, acceptance criteria, completed Work Units, active Work Unit, blockers, verification status, drift status, and next action.
3. Claude checks the current repository state before editing.
4. If the repository conflicts with the handoff, the repository is treated as authoritative.
5. Work resumes from the smallest next action that advances the active Work Unit.

## Install

### Claude Code

```sh
# add marketplace
/plugin marketplace add sovea/cc-marketplace

# install plugin
/plugin install plan-anchor@sovea
```

## License

MIT
