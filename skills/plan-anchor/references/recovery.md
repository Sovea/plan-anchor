# Recovery Semantics

How Plan Anchor resumes a task after context compaction, a new session, or an explicit handoff.

## Recovery Sequence

1. **Locate the current task.**
   Read `.claude/plan-anchor/current.txt`. Its single line is the slug of the currently attached task. If the file is missing or empty, there is no current task — ask the user which task to resume or start a new one.

2. **Load the state file.**
   Open `.claude/plan-anchor/<slug>.md`. Parse frontmatter and the five sections. This is the authoritative record of mission, plan, Work Units, verification, and handoff.

3. **Align against the repository.**
   Run `git status` and compare against the Handoff section's `Repository assumptions`. Fetch the actual set of modified files; do not trust the state file's "Files touched" list without verifying.

4. **Resolve conflicts in favor of the repository.**
   When the state file and repo disagree (e.g., a Work Unit is marked `complete` but its evidence file is absent, or `active_wu` points to something that's already fully committed), trust the repo. Update the state file to reflect reality, noting the reconciliation in the Drift Log only if the difference is meaningful.

5. **Identify the smallest next action.**
   Read the active Work Unit's `Done when` list. The first unchecked item is the next action. If every item is checked but the WU is not `complete`, run its verification before closing it.

6. **Announce the recovery summary.**
   Before any tool call, emit a 4–6 line summary: mission, active WU, what the repo shows vs. the state file, and the smallest next action. This replaces the old "reconstruct from handoff" prose.

## What triggers recovery

- `SessionStart` hook fires (source ∈ `startup`, `resume`, `clear`, `compact`) and `current.txt` is non-empty.
- User invokes `/plan-anchor:resume [slug]` explicitly.
- A fresh agent receives a Handoff section pasted as input.

## What does NOT trigger recovery

- A new `/plan-anchor:start` on a different slug. That starts a new task, repoints `current.txt` after the new state file is created, and does not require the previous task to be marked complete. The previous `<slug>.md` remains resumable.

`/plan-anchor:resume <slug>` *does* switch the current task and run recovery — it is the single entry point for both "recover the current task" (no arg) and "switch + recover" (with arg). There is no separate pointer-only switch command.

`/plan-anchor:done` is a completion gate, not a task-switch gate. Do not ask the user to run `/plan-anchor:done` before `/plan-anchor:start` unless they are actually trying to complete the current task.

## Conflict resolution rules

| State file says | Repo says | Resolution |
| --- | --- | --- |
| WU complete with evidence | evidence file exists | proceed |
| WU complete with evidence | evidence file missing | demote to `active`, record in Drift Log |
| WU active on file X | file X already committed and matches `Done when` | mark WU complete, update evidence |
| Branch = main | branch = feature/foo | update state, do not switch branches |
| Worktree = clean | working tree dirty | update state, list real changes under Files touched |

## Cross-session integrity

The state file has no concurrency control. If two Claude Code sessions attach to the same repo and both edit the same `<slug>.md`, the last write wins. For multi-agent work the user is expected to coordinate task slugs so each agent owns a different `<slug>.md`.
