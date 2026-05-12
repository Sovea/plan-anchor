# Example: Resume From Handoff

A walkthrough of what Plan Anchor does when a new session attaches to a task that already has state. Uses the `saved-filters` task from `examples/governed.md`.

## Trigger

Either:

- The user opens a new Claude Code session in the same repo. `SessionStart` (source=`startup`) fires with `.claude/plan-anchor/current.txt` containing `saved-filters`.
- The user runs `/anchor:resume` (optionally with a slug).
- The user pastes a Handoff section as input.

## Recovery sequence

```text
1. Read .claude/plan-anchor/current.txt
   → "saved-filters"

2. Load .claude/plan-anchor/saved-filters.md
   → frontmatter: active_wu=WU-2, status=active
   → WU-1 complete, WU-2 active, WU-3 pending
   → AC1 complete; AC2, AC3 pending

3. Align against repo: `git status`
   → branch=feature/saved-filters
   → modified: web/sidebar/SavedFilters.tsx
   → untracked: web/sidebar/SavedFilters.test.tsx

4. Reconcile:
   - state: worktree=modified ✓ (matches)
   - state: WU-1 complete, evidence at commit a3f1c2
     → verify: git log --oneline | grep a3f1c2 ✓
   - state: WU-2 active, component test file listed as "pending"
     → verify: SavedFilters.test.tsx exists but is untracked ✓ (consistent)

5. Identify smallest next action:
   - WU-2 Done-when: [x] render, [ ] empty state, [ ] component test
   - first unchecked: "Empty state (no filters yet) shown with a placeholder"

6. Announce recovery summary:
   - Mission: saved filters on the issue list
   - Active: WU-2 (Display saved filters)
   - Repo matches state
   - Next action: implement the empty-state branch in SavedFilters.tsx
```

## What the agent says on recovery

A 4–6 line opener, before any tool call:

```text
Resumed task "saved-filters". WU-1 is complete (saved_filters table + API, 7 tests green).
WU-2 is active: sidebar renders filters, empty state and component test still pending.
Repo matches the state file: feature branch, SavedFilters.tsx modified, test file untracked.
Next: implement the empty-state branch, then add the two-case component test.
```

Then the agent proceeds with the first edit (which hits the `pre_edit` hook, which confirms WU-2 is active and `SavedFilters.tsx` is in its scope).

## Conflict example

Suppose the state file claimed WU-1 was `complete` with evidence at commit `a3f1c2`, but `git log --oneline` showed no such commit (e.g., the branch was rebased and the commit hash changed).

Recovery updates the state file:

```md
## WU-1 — Persist saved filters — complete
- Evidence: migration + API tests land on feature/saved-filters
  (evidence commit reference lost to rebase — verified tests green at HEAD)
```

and adds a Drift Log row only if the divergence is material (in this case, a commit hash changing on rebase is not material — the tests still pass at HEAD).

## What resume does NOT do

- It does not roll the repo back to match the state file. The repo is always authoritative.
- It does not re-run completed Work Units just because evidence references are stale.
- It does not switch branches on the user's behalf.
- It does not start editing before emitting the recovery summary.
