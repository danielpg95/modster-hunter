# 0014 — Encounter timings, a work-time spawn countdown, and no throws outside "waiting"

- **Status:** Accepted
- **Date:** 2026-10-08
- **Decided by:** @victor-aguilars (in P2-06; numbers proposed by Claude, tune in P2-10)

## Context

Decision 0005 defines the encounter states but leaves open how long the
timed phases last ("the result card shows for a few seconds"), what the spawn
countdown does between turns, and what a Throw press does while a Modster is
still appearing or the wobble plays. Many turns are shorter than a biome's
`encounterEverySec` (default 10–30 s).

## Options

- Timings: snappy (1 s / 1.5 s / 4 s), relaxed (1.5 / 2.5 / 6), minimal (0.5 / 0.8 / 2.5).
- Countdown: pause between turns and carry over; restart every turn (short
  turns would rarely see a Modster); pause and carry over with a quick first one.
- Extra presses: ignored, or queued for after the wobble.

## Decision

1. **Phase lengths** (`ENCOUNTER` in `plugin/hooks/constants.ts`): appearing
   **1 s**, throw wobble **1.5 s**, result card **4 s**. The idle timeout stays
   the `encounterIdleTimeoutSec` option (default 90 s).
2. **Spawn countdown counts work time only.** A delay is drawn uniformly from
   the biome's `encounterEverySec` at session start and after each result card
   ends. It advances only while a turn runs and carries over between turns.
3. **Throw only works while waiting.** Presses during appearing or the wobble
   are ignored and cost no attempt; the band shows no Throw button then (P2-07).
4. Each throw rolls once when it's made (`random() < catchRate`); the wobble
   reveals the result.

## Consequences

- `plugin/hooks/game/encounter-machine.ts` implements this; P2-07 draws each
  phase and hides the button outside `waiting`.
- P2-10 tunes the numbers; changing them needs a new decision.
