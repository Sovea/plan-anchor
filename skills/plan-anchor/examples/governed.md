# Example: Governed Feature Task

A filled-in state file for a feature that spans persistence, sidebar rendering, and query application. This is what `.claude/plan-anchor/saved-filters.md` looks like after the second Work Unit has landed.

```md
---
task: Add saved filters to the issue list
slug: saved-filters
status: active
created: 2026-05-10T09:14:00Z
updated: 2026-05-12T16:03:00Z
active_wu: WU-2
---

# Mission

Let users save the current issue filter as a named preset and reapply it from the sidebar.

## Scope

- Persist saved filters per user.
- Render saved filters in the issue list sidebar.
- Apply a saved filter to the current issue list.

## Non-Goals

- Sharing filters between users.
- Editing or renaming saved filters after creation.

## Constraints

- No change to the existing `IssueQuery` semantics.
- Must work with the current `useIssueList` hook without breaking its cache keys.

# Acceptance Criteria

- [x] **AC1** — A user can save the current filter set with a name.
- [ ] **AC2** — Saved filters appear in the sidebar after creation.
- [ ] **AC3** — Selecting a saved filter applies the stored query.

# Plan

- Approach: add a `saved_filters` table, a sidebar list component, and an apply action that replays the stored `IssueQuery`.
- Phases: persistence → sidebar → apply.
- Verification strategy: model tests for save/list; component test for sidebar; behavioral check of the end-to-end save → appear → apply flow.
- Drift guardrails: no changes to `IssueQuery` shape or `useIssueList` contract.

# Work Units

## WU-1 — Persist saved filters — complete

- Serves: AC1
- Scope: `db/schema/saved_filters.sql`, `server/models/saved_filter.ts`, `server/api/saved_filters.ts`
- Done when:
  - [x] Model + migration land
  - [x] POST/GET endpoints covered by integration tests
- Verification: `pnpm test server/models/saved_filter` and `pnpm test server/api/saved_filters`
- Evidence: all 7 tests green on commit `a3f1c2`
- Risks: migration conflict with pending unique-constraint PR — coordinated with owner

## WU-2 — Display saved filters — active

- Serves: AC2
- Scope: `web/sidebar/SavedFilters.tsx`, `web/hooks/useSavedFilters.ts`
- Done when:
  - [x] Sidebar section renders filters from the new endpoint
  - [ ] Empty state (no filters yet) shown with a placeholder
  - [ ] Component test covers both states
- Verification: `pnpm test web/sidebar/SavedFilters`
- Evidence: list render confirmed via Storybook snapshot; empty-state test pending
- Risks: sidebar layout shifts when list is long — capped at 20 rows with scroll

## WU-3 — Apply saved filters — pending

- Serves: AC3
- Scope: `web/sidebar/SavedFilters.tsx`, `web/hooks/useIssueList.ts`
- Done when:
  - [ ] Clicking a saved filter updates `IssueQuery`
  - [ ] Issue list refreshes without a page reload
- Verification: behavioral test of save → click → list updates
- Evidence:
- Risks: cache key collision with the default filter — confirmed safe via `useIssueList` contract audit

# Verification

| Layer | Command | Status | Evidence |
| --- | --- | --- | --- |
| static | `pnpm typecheck` | passed | no errors on commit `a3f1c2` |
| tests | `pnpm test server/models/saved_filter` | passed | 3/3 |
| tests | `pnpm test server/api/saved_filters` | passed | 4/4 |
| tests | `pnpm test web/sidebar/SavedFilters` | not_run | — |
| behavioral | save → appear → apply | not_run | — |

# Drift Log

_None._

# Handoff

- Repository assumptions: branch=feature/saved-filters, worktree=modified (WU-2 component edits staged, test file untracked)
- Completed WUs: WU-1 — saved_filters table and API live, tests green.
- Active WU: WU-2 — sidebar renders filter list, empty-state + component test still pending.
- Remaining WUs: WU-3 — apply saved filter on click.
- Files touched: `web/sidebar/SavedFilters.tsx` (render done, empty state pending); `web/hooks/useSavedFilters.ts` (complete).
- Open blockers: None.
- Smallest next action: implement the empty-state branch in `SavedFilters.tsx` and add the two-case component test, then re-run `pnpm test web/sidebar/SavedFilters`.
```

## Why this example is shaped this way

- **Frontmatter first.** Hooks parse `slug`, `status`, and `active_wu` without reading the whole file.
- **One active WU.** WU-2 is `active`, WU-1 is `complete`, WU-3 is `pending`. Guardrail G1 enforces this.
- **AC1 has evidence on its own line.** AC2 and AC3 do not yet; `/plan-anchor:done` will reject completion until they do.
- **Verification rows are honest.** The component test and behavioral check are `not_run`, not a hopeful "passed".
- **Handoff section is self-sufficient.** A fresh agent resuming from this file can identify the next tool call without reading the conversation history.
