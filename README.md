# Plan Anchor

**Plan Anchor keeps Claude Code on mission across many turns.** It makes three promises for long, complex coding tasks:

1. **No drift.** Scope, architecture, API contracts, and acceptance criteria cannot silently change.
2. **No dropouts.** State survives context compaction and session restart without user intervention.
3. **No false completion.** A task cannot be marked done until every acceptance criterion has recorded evidence.

The skill does this with three mechanisms, not twenty pages of protocol:

- **A single state file** per task at `.claude/plan-anchor/<slug>.md`, tracked by `.claude/plan-anchor/current.txt`.
- **Hooks** that enforce the rules (block edits outside the active Work Unit, inject state into every turn, flush handoff before compaction).
- **`/plan-anchor:*` slash commands** as the primary UI.

## Install

```sh
/plugin marketplace add sovea/cc-marketplace
/plugin install plan-anchor@sovea
```

## Quick start

```text
/plan-anchor:start refactor-auth-middleware
```

Plan Anchor will capture the mission, acceptance criteria, plan, and Work Units into `.claude/plan-anchor/refactor-auth-middleware.md`, set it as current, and govern execution from there. Use `/plan-anchor:status` any time to see where you are.

If you're not already in a session, a prose fallback also works:

> "Use Plan Anchor for this refactor."

## Commands

| Command | Purpose |
| --- | --- |
| `/plan-anchor:start <slug>` | Capture mission, AC, plan; create `<slug>.md`; set as current. |
| `/plan-anchor:status` | Print the current task's state in ~30 lines. |
| `/plan-anchor:drift` | Run a drift check against Plan, Non-Goals, and AC. |
| `/plan-anchor:handoff` | Refresh the Handoff section so a fresh agent can resume. |
| `/plan-anchor:resume [slug]` | Reload state, align with repo, announce the next action. |
| `/plan-anchor:switch <slug>` | Point `current.txt` at another existing task without running resume. |
| `/plan-anchor:next` | Smart dispatcher — read state and call the right sub-command. |
| `/plan-anchor:done` | Completion gate — runs verification in a subagent, refuses unless every AC has evidence. |

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

## Native integrations

The `/plan-anchor:*` commands lean on Claude Code's built-in primitives instead of re-implementing them:

| Primitive | Used by | Purpose |
| --- | --- | --- |
| **Plan mode** (`EnterPlanMode` / `ExitPlanMode`) | `/plan-anchor:start` (Plan phase), `/plan-anchor:drift` (replan on material drift) | Use the harness's built-in plan-approval UX instead of inventing one in prose. The user-approved plan text lands directly in `state.md`. |
| **Tasks** (`TaskCreate` / `TaskUpdate` / `TaskList`) | `/plan-anchor:start` (decompose), `/plan-anchor:status` (render), `/plan-anchor:done` (close on success) | Each Work Unit is mirrored as a native Task with subject `[<slug>] WU-N: <goal>`, so per-WU progress shows in Claude Code's native task UI. `state.md` remains canonical. |
| **Subagents** (`Agent`) | `/plan-anchor:drift` (Explore-type detector), `/plan-anchor:done` (general-purpose verifier) | Diff inspection and test/lint output run in isolated subagents. The main conversation only sees structured summaries — noisy log output never floods the main context. |
| **Hooks** | the six scripts in `hooks/` | The enforcement layer (described below). Hooks fire at session/tool/compaction boundaries; commands fire on user invocation. |

## State file

The state file is intentionally small (soft cap ~2 KB) and gitignored by default. It contains mission, acceptance criteria, plan, Work Units, verification, drift log, and handoff — as sections of one Markdown file, not seven templates. See `skills/plan-anchor/state/template.md`.

Layout per task, created by `/plan-anchor:start`:

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

Plan Anchor is at v0.1.0. Landed: skill definition, state schema, guardrails, recovery semantics, the full `/plan-anchor:*` command layer (including `:next`), all six enforcement hooks, and native-primitive integrations (plan mode, Tasks, subagents). Effectiveness measurement on real tasks is deferred to a separate, dedicated eval skill — not bundled into this repo.

## License

MIT
