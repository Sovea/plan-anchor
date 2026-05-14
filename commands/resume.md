---
description: Resume a Plan Anchor task. With a slug, switches the active task first; then reloads state, aligns with repo, emits a 4–6 line recovery summary, names the smallest next action, and continues with it.
argument-hint: [task-slug]
allowed-tools: [Read, Edit, Write, MultiEdit, Bash, Grep, Glob]
---

Resume a Plan Anchor task. Follow the 6-step sequence from `skills/plan-anchor/references/recovery.md`.

Passing a slug (`/plan-anchor:resume <slug>`) is the supported way to switch the active task: it points `current.txt` at `<slug>` and then runs the full recovery sequence below. With no slug, recovers whichever task `current.txt` already names.

## 1. Locate the active task

- If `$1` is provided: verify `.claude/plan-anchor/$1.md` exists. If it does not, list existing `.claude/plan-anchor/*.md` slugs (excluding `current.txt`) and stop with `No task "<slug>". Use /plan-anchor:start <task description> to create it, or one of: <list of existing slugs>.` — do **not** touch `current.txt`. If it exists, write `$1` to `.claude/plan-anchor/current.txt` (overwrite) before continuing.
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

Then continue in the same turn with the smallest next action you just identified. The `pre_edit` hook reads state at edit time and will attach to the active WU correctly — there is no need to wait for a fresh turn.

## When to invoke

- At the start of a new Claude Code session that should continue prior Plan Anchor work.
- After a context compaction, if the `SessionStart` hook (M3) isn't yet installed.
- Any time the state file and the repo seem out of sync.
- To switch to another existing task — `/plan-anchor:resume <slug>` repoints `current.txt` and runs the full recovery sequence in one step.
