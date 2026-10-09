# 0016 — Background subagents count as work time for the spawn countdown

- **Status:** Proposed — settled by @danielpg95 (game design; extends 0005 and 0014)
- **Date:** 2026-10-08
- **Proposed by:** @victor-aguilars, after playing the P2-07 band

## Context

0005 spawns encounters only while a turn runs, and 0014 counts only turn time
toward the next spawn. In play, waiting on background subagents showed no
Modsters: the main turn ends while the agents keep working, so the countdown
pauses. (Questions to the user are a different case: the question dialog hides
the band; see 0015.)

## Options

1. **Only during turns** (0005/0014 as is).
2. **Turns plus background subagents**: the countdown runs while a turn runs
   or at least one subagent is working.
3. **Any time the session is open**: a pure idle game; may distract while the
   person reads or types.

## Decision

1. "Work time" (0014 point 2) is time during which a turn runs **or** at least
   one subagent is running, tracked with `classic.SubagentStart` /
   `classic.SubagentStop` (by `agent_id`). Overlaps count once.
2. New encounters may spawn during that time, not only during a turn (this
   extends 0005's first point). Everything else in 0005 and 0014 stays.

## Consequences

- New roadmap task P2-11.
- The encounter machine gets `agentStart` / `agentEnd` inputs (or a running
  count); its tests cover overlapping turns and agents.
- If a subagent's stop event is lost, the countdown could run forever; P2-11
  caps it (e.g. clear the agent count at `session.end` and on `turn.start`'s
  own bookkeeping) and tests that.
