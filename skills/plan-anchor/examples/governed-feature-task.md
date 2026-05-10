# Governed Feature Task Example

## Mission Contract

## Mission

Add saved filters to an issue list so users can quickly reapply common searches.

## Scope

- Save the current filter set with a user-provided name.
- List saved filters in the issue list sidebar.
- Apply a saved filter to the current issue list.

## Non-Goals

- Sharing filters between users.
- Editing saved filters after creation.

## Acceptance Criteria

- [ ] AC1: Users can save the current filter set with a name.
- [ ] AC2: Saved filters appear in the sidebar after creation.
- [ ] AC3: Selecting a saved filter updates the issue list query.

## Work Units

### WU-1: Persist saved filters

Acceptance criteria served: AC1.

Done when saved filter data is stored and covered by tests.

### WU-2: Display saved filters

Acceptance criteria served: AC2.

Done when the sidebar renders saved filters and handles empty state.

### WU-3: Apply saved filters

Acceptance criteria served: AC3.

Done when selecting a saved filter updates query state and refreshes results.

## Progress Ledger Excerpt

| Item | Status | Evidence |
| --- | --- | --- |
| AC1 | complete | WU-1 tests pass |
| AC2 | in progress | Sidebar renders data, empty state pending |
| AC3 | pending | Not started |
| Current focus | WU-2 | Finish empty state and sidebar verification |

## Drift Check Excerpt

- Mission unchanged: yes.
- Scope expanded: no.
- Architecture changed: no.
- Acceptance criteria weakened: no.
- Drift recorded: none.

## Handoff State Excerpt

## Current Phase

Execute / Verify

## Completed

- WU-1: Persist saved filters.

## In Progress

- WU-2: Display saved filters. Empty state still needs verification.

## Remaining

- WU-3: Apply saved filters.
- Final behavioral verification for save/list/apply flow.

## Next Action

Complete WU-2 empty state, run sidebar component tests, then update the Progress Ledger.
