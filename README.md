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

## Hooks

Plan Anchor is not a protocol document the agent is asked to remember. The five hard rules are enforced at the harness level through six plugin-registered hooks:

| Event | Script | Role |
| --- | --- | --- |
| `SessionStart` | `hooks/session_start.js` | Inject a 4-line resume brief so a new or post-compaction session knows the active task, Work Unit, and next action. |
| `UserPromptSubmit` | `hooks/user_prompt.js` | Inject active WU + scope + open drift + local-fix loop warning into every turn. |
| `PreToolUse` (`Edit\|Write\|MultiEdit`) | `hooks/pre_edit.js` | **Block** any edit when no Work Unit is active or when the target is outside the active WU's declared scope (G1). |
| `PostToolUse` (`Edit\|Write\|MultiEdit`) | `hooks/post_edit.js` | Maintain the local-fix-loop counter in a per-task sidecar `.meta.json` (G2 detection). |
| `PreCompact` | `hooks/pre_compact.js` | Flush the Handoff section to disk before compaction so resume works afterwards (G3 support). |
| `Stop` | `hooks/stop.js` | Quietly refresh Handoff at the end of every agent turn so every pause leaves a resume-ready state file. |

All hooks read `${CLAUDE_PROJECT_DIR}/.claude/plan-anchor/` and are fail-open — any script error exits 0 silently rather than breaking the session. If there is no active task, every hook no-ops immediately.

See `skills/plan-anchor/references/guardrails.md` for the five hard rules and why each exists.

## State file

The state file is intentionally small (soft cap ~2 KB) and gitignored by default. It contains mission, acceptance criteria, plan, Work Units, verification, drift log, and handoff — as sections of one Markdown file, not seven templates. See `skills/plan-anchor/state/template.md`.

Layout per task, created by `/anchor:start`:

```
.claude/plan-anchor/
├── .gitignore           # single line: *  — keeps the whole dir out of git
├── current.txt          # slug of the currently active task
├── <slug>.md            # human-readable state file (mission, AC, WUs, ...)
└── <slug>.meta.json     # hook-managed sidecar: recent_touches, loop_counter
```

The `.gitignore` is directory-scoped so Plan Anchor never touches the repo's root `.gitignore`. Works on repos that aren't under git at all.

Do not store secrets, credentials, or private external data in the state file.

## Status

Plan Anchor is at v0.1.0. The skill definition, state schema, guardrails, recovery semantics, the full `/anchor:*` command layer, and all six enforcement hooks are in place. The evaluation harness (M5) is the remaining piece.

## License

MIT
