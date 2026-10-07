# 0010 — Roadmap + workboard + session handoffs as the tracking system

- **Status:** Accepted
- **Date:** 2026-10-07
- **Decided by:** @danielpg95

## Context

Several people, each often working through Claude Code sessions, need to stay
on the same track: know what's planned, who is on what, and where the last
session stopped.

## Decision

The repo itself is the tracker, so any Claude session can read it without extra
tools:

| File | Purpose | Who edits it |
| --- | --- | --- |
| `docs/ROADMAP.md` | Phases and tasks with IDs (`P2-04`), dependencies and acceptance criteria. The plan. | Maintainer, or via a PR that says why |
| `docs/WORKBOARD.md` | One row per task someone is working on or blocked on: owner, branch, status, next step. | The task's owner |
| `docs/sessions/` | One new file per work session: what was done, decisions, next steps. Never edited after. | Whoever ran the session |
| `docs/decisions/` | Decisions (see its README). | Anyone, through PR review |

- **Claiming:** a task is yours once a commit adding your row to
  `WORKBOARD.md` lands on `main` (small "claim" PR, or direct push for
  maintainers). First merged wins. A GitHub issue may mirror the task; the
  workboard is the source of truth.
- **Stale claims:** a row not updated for 7 days can be released by a
  maintainer after pinging the owner.
- **Done:** the PR that completes a task removes its row from the workboard and
  ticks the task in the roadmap.
- `tools/check-tracking.mjs` (run in CI) verifies the workboard references real
  roadmap task IDs, no task has two owners, and dependencies of in-progress
  tasks are done.
