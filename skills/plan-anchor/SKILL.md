---
name: plan-anchor
description: Use when the user types a `/anchor:*` command or says "use plan anchor" — or when a long, multi-file, architecture-sensitive task clearly needs drift control, loop-breaking, or resumable handoff.
version: 0.1.0
---

# Plan Anchor

Keep complex Claude Code tasks on mission across many turns and across context compaction. The skill makes three promises:

1. **No drift.** Scope, architecture, API contracts, and acceptance criteria cannot be silently changed.
2. **No dropouts.** State survives context compaction and session restart without user intervention.
3. **No false completion.** A task cannot be marked done without recorded evidence per acceptance criterion.

## When to use

- User invokes any `/anchor:*` command, or says "use plan anchor".
- Task is multi-file, multi-phase, architecture-sensitive, or likely to span many turns.
- User needs a task to be resumable after pause, compaction, or a new session.

Skip for one-line fixes, routine explanations, code reading, and exploratory brainstorming unless the user asks explicitly.

## How it works

Plan Anchor is delivered as three layers, not as prose:

- **State file** — one Markdown file per task at `.claude/plan-anchor/<slug>.md`, with the active slug tracked in `.claude/plan-anchor/current.txt`. This file is the single source of truth for mission, plan, Work Units, verification, drift, and handoff. See `state/template.md`.
- **Hooks** — six Node.js hooks at the plugin root (`hooks/hooks.json` + `hooks/*.js`) enforce the guardrails automatically: `SessionStart` injects a resume brief, `UserPromptSubmit` injects active WU + open drift + loop warning each turn, `PreToolUse` on `Edit|Write|MultiEdit` **blocks** edits outside the active WU's scope, `PostToolUse` maintains the local-fix loop counter in a sidecar (`.meta.json`), `PreCompact` flushes Handoff before compaction, `Stop` quietly refreshes Handoff so every pause leaves a resume-ready state file.
- **Commands** — `/anchor:start`, `/anchor:status`, `/anchor:drift`, `/anchor:handoff`, `/anchor:resume`, `/anchor:switch`, `/anchor:done`. These are the primary UI; prose triggers are a fallback only. Definitions live in `commands/anchor/*.md`.

## Core flow

1. **Intake** — capture mission, scope, non-goals, constraints, acceptance criteria. Ask before coding if any missing item could change the solution.
2. **Plan** — name the approach, phases, verification strategy, and drift guardrails. Use plan mode for architecture-sensitive work.
3. **Decompose** — break the plan into Work Units, each mapped to at least one acceptance criterion. Only one Work Unit may be `active`.
4. **Execute** — before each edit, state the active Work Unit and confirm the file being changed is in its scope.
5. **Verify** — after each Work Unit, run the verification listed in its entry and record evidence. Gaps stay as gaps, not as "verified".
6. **Handoff** — before pause, compaction, or session switch, update the Handoff section so a fresh agent can resume from the state file alone.

## Guardrails

Five hard rules are enforced: active-WU-required, local-fix-loop breaker, evidence-gated completion, drift-requires-confirmation, and verification-equals-what-ran. Full definitions and failure-mode rationale in `references/guardrails.md`.

## Resume

On `SessionStart`, `/anchor:resume`, or when a Handoff section is pasted in, follow the recovery sequence in `references/recovery.md`. Repository state is authoritative over the state file on conflict.

## Resource map

Load these files only when needed:

- `state/template.md` — canonical state file shape.
- `references/guardrails.md` — the 5 hard rules.
- `references/recovery.md` — resume semantics and conflict resolution.
- `commands/anchor/*.md` (at plugin root) — slash-command definitions: `start`, `status`, `drift`, `handoff`, `resume`, `switch`, `done`.
- `hooks/hooks.json` + `hooks/*.js` (at plugin root) — enforcement hooks and the shared parser in `hooks/lib/state.js`.
- `examples/governed.md` — a filled-in state file for a multi-Work-Unit feature.
- `examples/resume.md` — a resume-from-handoff walkthrough.

## What Plan Anchor will not do

- Create or modify state files without `/anchor:start` or explicit user approval.
- Store secrets, credentials, tokens, or private external data in the state file.
- Weaken tests, widen types, or delete assertions to make a check pass.
- Claim completion while any acceptance criterion lacks evidence.
