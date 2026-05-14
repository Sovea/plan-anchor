# AGENTS.md

Guidance for AI coding agents working **on** the Plan Anchor codebase.

## What this project is

Plan Anchor is a lightweight execution governance layer for Claude Code that keeps complex implementation anchored to mission, acceptance criteria, verification, and handoff state. It is shipped as a Claude Code plugin (skill + hooks + slash commands), not a runtime library.

The product is governance, not protocol prose. Every change here should ask: *which anchor (mission / AC / verification / handoff) does this strengthen, and which guardrail enforces it?* If the answer is "none," the change probably doesn't belong.

## Repo layout

```
plan-anchor/
├── README.md                     # user-facing overview
├── AGENTS.md                     # this file
├── commands/                     # /plan-anchor:* slash command definitions
│   ├── start.md  status.md  drift.md  handoff.md
│   ├── resume.md  next.md   done.md
├── hooks/                        # six harness-level enforcement hooks
│   ├── hooks.json                # plugin hook registration
│   ├── session_start.js  user_prompt.js
│   ├── pre_edit.js       post_edit.js
│   ├── pre_compact.js    stop.js
│   └── lib/state.js              # shared state-file parser
└── skills/plan-anchor/
    ├── SKILL.md                  # skill definition (loaded into context on trigger)
    ├── state/template.md         # canonical state file shape
    ├── references/
    │   ├── guardrails.md         # the 5 hard rules and why each exists
    │   └── recovery.md           # resume + conflict-resolution semantics
    └── examples/                 # filled-in state files for reference
```

## The three layers (and why they're coupled)

A change in one layer almost always implies a change in another. Treat them as one unit:

- **State file** (`.claude/plan-anchor/<slug>.md`) — single source of truth. Soft 2 KB cap. Sections: Mission, AC, Plan, Work Units, Verification, Drift, Handoff. Schema lives in `skills/plan-anchor/state/template.md`.
- **Hooks** (`hooks/*.js`) — enforce the guardrails. They run in the harness, not in Claude. They MUST fail-open: any unexpected error exits 0 silently. No active task → no-op immediately.
- **Commands** (`commands/*.md`) — the user-facing UI. They lean on native primitives (`EnterPlanMode`/`ExitPlanMode`, `TaskCreate`/`TaskUpdate`, `Agent`) rather than re-implementing them in prose.

Coupling examples:
- Adding a new state-file section → update `state/template.md`, the parser in `hooks/lib/state.js`, and any command/hook that reads it.
- Tightening a guardrail → update `references/guardrails.md`, the enforcing hook, and the relevant command's behavior on the failure path.
- A new command → add it to `commands/`, mention it in `SKILL.md`'s resource map and in `README.md`'s command table.

## Conventions

### Hooks must fail-open
Hooks run on every turn, edit, and compaction. A hook that throws can break the user's session. Wrap every script body in try/catch and exit 0 on any unexpected error. The only intentional non-zero exit is `pre_edit.js`'s G1 block, which is a deliberate user-facing refusal.

### State file is canonical, but repo state wins on conflict
On resume, the recovery sequence (`references/recovery.md`) reconciles state file vs. repo. If they disagree, repo state is authoritative — update the state file to match, don't try to roll the repo back.

### Don't add a guardrail without a documented failure
The five rules in `references/guardrails.md` each cite the specific failure mode they prevent. New rules need the same: one rule, one failure it catches, one enforcer. The "What is NOT a guardrail" section at the bottom is load-bearing — it's a record of rejected ideas and why.

### Commands lean on native primitives
- Plan mode for the Plan phase and for replanning on material drift — don't reinvent plan-approval UX in prose.
- `TaskCreate` mirrors Work Units so per-WU progress shows in the harness's native task UI. The state file remains canonical; Tasks are the projection.
- `Agent` (Explore for diff inspection in `/plan-anchor:drift`, general-purpose for verification in `/plan-anchor:done`) keeps noisy log output out of the main conversation.

### Plugin install paths
Hooks reference `${CLAUDE_PROJECT_DIR}/.claude/plan-anchor/` and `hooks.json` registers events for the plugin runtime. The `.claude/plan-anchor/` directory is created by `/plan-anchor:start` and gitignored via a directory-scoped `.gitignore` (single `*` line) — Plan Anchor never modifies the repo's root `.gitignore`.

## When making changes

1. **Read `references/guardrails.md` first.** It's the contract. Most changes either strengthen one of G1–G5 or improve their UX; pure novelty is rare and should be questioned.
2. **Touch all coupled layers in one change.** A command edit that implies a state-file or hook change should land together, not in separate passes.
3. **Keep the state file small.** Soft cap ~2 KB. If a section grows unbounded (Drift Log, Verification table), the agent will compact it; don't add features that fight that.
4. **Don't store secrets in the state file.** It is human-readable Markdown, not a vault. The "What Plan Anchor will not do" list in `SKILL.md` is binding.
5. **No tests for the hooks yet.** This is a known gap. If you add tests, place them under a `tests/` directory at repo root and document the runner in this file.

## Working with Plan Anchor while editing Plan Anchor

Plan Anchor's own `pre_edit.js` G1 gate is exempted from this repo's `.claude/plan-anchor/**` paths (see commit `1a2fe99`). Outside that exemption, if you start a `/plan-anchor:start` task to govern your own edits, the gate will hold you to the active Work Unit's scope just like any other consumer — that's the dogfood path.

## License

MIT
