---
description: Resume a Plan Anchor task. Reloads state, aligns with repo, emits a 4–6 line recovery summary, and names the smallest next action.
argument-hint: [task-slug]
allowed-tools: [Read, Edit, Bash]
---

Resume a Plan Anchor task. Follow the 6-step sequence from `skills/plan-anchor/references/recovery.md`.

## 1. Locate the active task

- If `$1` is provided: write it to `.claude/plan-anchor/current.txt` (overwrite) before continuing.
- Read `.claude/plan-anchor/current.txt`. Let `slug` be its single line.
- If `current.txt` is missing/empty and no `$1` was provided: list existing `.claude/plan-anchor/*.md` files (excluding `current.txt`) and ask the user which to resume, or suggest `/plan-anchor:start <task description>`.

## 2. Load state

Read `.claude/plan-anchor/<slug>.md`. Parse frontmatter (`task`, `status`, `active_wu`) and the five sections. If the file is missing or frontmatter is unparseable, stop and report.

## 3. Align against the repository

Run:

```bash
git status --short
git rev-parse --abbrev-ref HEAD
git log --oneline -10
```

Build a "repo snapshot": branch, worktree state, recent commits, touched files.

## 4. Reconcile

Compare the repo snapshot with the state file's `Handoff` section and Work Unit evidence. Apply the rules in `references/recovery.md`:

- Repo is always authoritative. Update the state file to match reality — never alter the repo to match the state file.
- If a WU is marked `complete` but its evidence can't be found in the repo (missing file, missing commit, missing test), demote it to `active` and add a Drift Log row noting the reconciliation.
- If a WU is marked `active` but its `Done when` is fully satisfied by committed work, mark it `complete` and update evidence.
- If branch or worktree state differs from `Repository assumptions`, update the Handoff section accordingly without switching branches on the user's behalf.

Use Edit to apply updates to the state file. Bump `updated:` to current ISO 8601 UTC.

## 5. Find the smallest next action

Read the active Work Unit's `Done when` list. The next action is:

- The first unchecked `Done when` item → implement it.
- If every item is checked but the WU is not `complete` → run the WU's `Verification` line and record evidence.
- If the WU is `complete` but `active_wu` still points at it → promote the next pending WU to `active`, update frontmatter, restart this step.
- If all WUs are complete → run `/plan-anchor:done`.

Phrase the next action as an imperative verb phrase (e.g., "Implement the empty-state branch in X and add the two-case component test").

## 6. Emit the recovery summary

Before any other tool call, print a 4–6 line summary:

```
Resumed task "<task>" (slug: <slug>).
Completed: <N WUs> — <one-line gist>.
Active: WU-M — <goal>. <one-line current state>.
Repo: <branch>, worktree=<clean|modified>; <reconciliation note or "matches state">.
Open blockers / drift: <none | one-line summary>.
Next: <imperative>.
```

Do not start editing in the same turn as the recovery summary — hand control back to the user or to the next tool call, so hooks (when present) can attach to the right Work Unit.

## When to invoke

- At the start of a new Claude Code session that should continue prior Plan Anchor work.
- After a context compaction, if the `SessionStart` hook (M3) isn't yet installed.
- Any time the state file and the repo seem out of sync.
