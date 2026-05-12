# Recovery Semantics

How Plan Anchor resumes a task after context compaction, a new session, or an explicit handoff.

## Recovery Sequence

1. **Locate the active task.**
   Read `.claude/plan-anchor/current.txt`. Its single line is the slug of the currently active task. If the file is missing or empty, there is no active task — ask the user which task to resume or start a new one.

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
- User invokes `/anchor:resume [slug]` explicitly.
- A fresh agent receives a Handoff section pasted as input.

## What does NOT trigger recovery

- A new `/anchor:start` on a different slug. That starts a new task and does not touch other `<slug>.md` files.
- `/anchor:switch <slug>` updates `current.txt` but does not run the full recovery sequence; it relies on the next tool use or user prompt to pick up the new task's state.

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
