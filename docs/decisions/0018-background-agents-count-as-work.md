# 0018 — Background subagents count as work time for the spawn countdown

- **Status:** Accepted
- **Date:** 2026-10-09
- **Decided by:** @danielpg95 (issue #35; proposed by @victor-aguilars in #34, details drafted by Claude)

## Context

[0005](0005-encounter-lifetime.md) spawns new encounters only while a turn
runs, and [0014](0014-encounter-timings.md) point 2 counts only turn time toward
the next spawn. In play, waiting on background subagents showed no Modsters:
the main turn ends while the agents keep working, so the countdown pauses.

The mods API reports subagents through `classic.SubagentStart` and
`classic.SubagentStop`, each with an `agent_id`.

## Options

1. **Only during turns** (0005 and 0014 as they are).
2. **Turns plus subagents**: the countdown runs while a turn runs or at least
   one subagent is working.
3. **Any time the session is open**: a pure idle game; it may distract while
   the person reads or types.

## Decision

1. **Work time** (0014 point 2) is time during which a turn runs **or** at
   least one subagent runs. Subagents are tracked by `agent_id` from
   `classic.SubagentStart` to `classic.SubagentStop`. Overlapping turns and
   agents count once.
2. **New encounters may spawn during any work time**, not only during a turn.
   This replaces 0005's first point; the rest of 0005 and 0014 stands.
3. **A lost stop event can't keep the countdown running.** An agent stops
   counting at its `SubagentStop`, or `AGENT_WORK_MAX_MIN` (30) minutes after
   its start, whichever comes first. The set of running agents is cleared at
   `session.end`.
4. The encounter shows where it already does: the band (or the pane, 0015)
   draws an encounter whether or not a turn is running (0005).

## Consequences

- New roadmap task P2-11.
- The encounter machine gets agent start and stop inputs; its fake-clock tests
  cover overlapping turns and agents and the 30-minute cap.
- `AGENT_WORK_MAX_MIN` goes in `plugin/hooks/constants.ts`, citing this decision.
- P2-10 (playtest) checks that spawns while agents run don't feel distracting.
