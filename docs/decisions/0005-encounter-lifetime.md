# 0005 — An encounter lingers after the turn ends, until resolved or idle timeout

- **Status:** Accepted
- **Date:** 2026-10-07
- **Decided by:** @danielpg95 (accepted Claude's suggestion)

## Context

Encounters only *start* while Claude is working (between `turn.start` and
`turn.complete`). The question was what happens when the turn ends mid-encounter.

## Decision

- **New encounters** only spawn while a turn is running.
- **An encounter in progress keeps going** after the turn ends, so the user
  can finish throwing at a Modster they were excited about.
- **Idle timeout:** if the user doesn't throw for `encounterIdleTimeoutSec`
  (default 90, a `userConfig` option), the Modster *wanders off*. That's recorded
  as "fled" in stats, the same as running out of attempts.
- If a new turn starts during an encounter, the idle timer resets; no second
  encounter spawns until this one resolves.
- The result card (caught / fled) shows for a few seconds, then the band clears.
- An encounter is not persisted: if the session ends or the mod reloads, it's
  gone without being counted.

## Consequences

The encounter is a small state machine:
`idle → appearing → waiting → throwing → (caught | waiting | fled) → result → idle`.
It's the core module of P2 and must be fully unit tested with a fake clock.
