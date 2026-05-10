---
plan_anchor_version: 0.1
task: [task name]
created: [timestamp]
updated: [timestamp]
status: [active / blocked / complete]
---

# Durable Plan Anchor

Use this file only when the user explicitly approves durable state. Do not store secrets, credentials, tokens, or private external data.

## Mission Contract

[Mission, scope, non-goals, constraints, acceptance criteria, risks]

## Execution Plan

[Chosen approach, rejected alternatives, implementation phases, verification strategy, drift guardrails]

## Work Units

| ID | Status | Goal | Acceptance Criteria | Done Conditions | Verification | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| WU-1 | pending | [goal] | [AC IDs] | [conditions] | [checks] | |

## Progress Ledger

[Current acceptance status, Work Unit status, blockers, validation, drift, and next action]

## Verification Matrix

| Check | Status | Evidence / Notes |
| --- | --- | --- |
| Static checks | not run | |
| Tests | not run | |
| Build | not run | |
| Behavioral verification | not run | |

## Drift Log

| Deviation | Reason | Impact | User Approval Needed | Status |
| --- | --- | --- | --- | --- |
| None | | | | |

## Handoff State

[Latest resumable handoff]

## Next Action

[Smallest action that advances the active Work Unit]
