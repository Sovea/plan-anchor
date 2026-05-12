# Plan Anchor

**Plan Anchor keeps Claude Code on mission across many turns.** It makes three promises for long, complex coding tasks:

1. **No drift.** Scope, architecture, API contracts, and acceptance criteria cannot silently change.
2. **No dropouts.** State survives context compaction and session restart without user intervention.
3. **No false completion.** A task cannot be marked done until every acceptance criterion has recorded evidence.

The skill does this with three mechanisms, not twenty pages of protocol:

- **A single state file** per task at `.claude/plan-anchor/<slug>.md`, tracked by `.claude/plan-anchor/current.txt`.
- **Hooks** that enforce the rules (block edits outside the active Work Unit, inject state into every turn, flush handoff before compaction).
- **`/anchor:*` slash commands** as the primary UI.

## Install

```sh
/plugin marketplace add sovea/cc-marketplace
/plugin install plan-anchor@sovea
```

## Quick start

```text
/anchor:start refactor-auth-middleware
```

Plan Anchor will capture the mission, acceptance criteria, plan, and Work Units into `.claude/plan-anchor/refactor-auth-middleware.md`, set it as current, and govern execution from there. Use `/anchor:status` any time to see where you are.

If you're not already in a session, a prose fallback also works:

> "Use Plan Anchor for this refactor."

## Commands

| Command | Purpose |
| --- | --- |
| `/anchor:start <slug>` | Capture mission, AC, plan; create `<slug>.md`; set as current. |
| `/anchor:status` | Print the current task's state in ~30 lines. |
| `/anchor:drift` | Run a drift check against Plan, Non-Goals, and AC. |
| `/anchor:handoff` | Refresh the Handoff section so a fresh agent can resume. |
| `/anchor:resume [slug]` | Reload state, align with repo, announce the next action. |
| `/anchor:switch <slug>` | Point `current.txt` at another existing task without running resume. |
| `/anchor:done` | Completion gate — refuses unless every AC has evidence and all drift is resolved. |

## When to use

- Multi-file, multi-phase, architecture-sensitive, or migration work.
- Tasks likely to continue across turns or context compaction.
- Concerns about plan drift, repeated incidental fixes, or a lost thread.
- Resuming from a prior handoff.

## When not to use

- One-line fixes, typos, trivial renames.
- Routine explanations or code reading.
- Single-file edits with obvious verification.
- Exploratory brainstorming before implementation begins.

## How it differs from a checklist

Plan Anchor is not a protocol document the agent is asked to remember. The rules are enforced at the harness level through hooks: editing a file outside the active Work Unit is blocked at the tool-use boundary, drift becomes visible in every turn, compaction flushes state to disk before it can drop, and completion claims are diffed against recorded evidence.

See `skills/plan-anchor/references/guardrails.md` for the five hard rules and why each exists.

## State file

The state file is intentionally small (soft cap ~2 KB) and gitignored by default. It contains mission, acceptance criteria, plan, Work Units, verification, drift log, and handoff — as sections of one Markdown file, not seven templates. See `skills/plan-anchor/state/template.md`.

Do not store secrets, credentials, or private external data in the state file.

## Status

Plan Anchor is at v0.1.0. The skill definition, state schema, guardrails, recovery semantics, and the full `/anchor:*` command layer are in place. The enforcement hooks (blocking edits outside the active Work Unit, auto-restoring state at session start, flushing handoff before compaction) and the evaluation harness are being delivered in subsequent milestones.

## License

MIT
