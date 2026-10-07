# 0003 — Pure-luck catching for v1; light skill element as a later experiment

- **Status:** Accepted
- **Date:** 2026-10-07
- **Decided by:** @danielpg95

## Decision

- v1: the user presses **Throw** (hotkey `1`). Each throw rolls once against the
  Modster's catch rate. A short "wobble" animation plays before the result.
- A throw is used up whether it succeeds or not. When all attempts are used
  without a catch, the Modster flees.
- All randomness goes through one injectable random source so tests are
  deterministic.

## Later

A light skill element (for example: stop a moving marker; landing in the sweet
spot multiplies the catch rate) is an experiment in phase 5 (task P5-05),
behind a setting. It ships only if a new decision accepts it.
