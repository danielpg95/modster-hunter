# 0004 — Attempts and catch rate per Modster, derived from rarity unless overridden

- **Status:** Accepted
- **Date:** 2026-10-07
- **Decided by:** @danielpg95 (rarity thresholds and default numbers proposed by Claude; tune freely in P2-05)

## Context

The owner asked for 1–X attempts per Modster, "based on the weight too, unless
overwritten on configuration".

## Decision

1. A Modster's **rarity tier** comes from its explicit `rarity` field if set.
   Otherwise it's computed from its **share of the biome's total weight** at
   encounter time:

   | Tier | Share of biome weight | Default attempts | Default catch rate |
   | --- | --- | --- | --- |
   | common | ≥ 20% | 3 | 0.50 |
   | uncommon | 5% – <20% | 3 | 0.35 |
   | rare | 1% – <5% | 4 | 0.20 |
   | legendary | < 1% | 5 | 0.08 |

2. `maxAttempts` and `catchRate` on the Modster override the tier defaults.
3. A biome may override them per Modster entry (`modsters[].maxAttempts`,
   `modsters[].catchRate`), which wins over the Modster's own values.
4. Precedence, highest first: biome entry → Modster file → tier default.
5. Bounds: `maxAttempts` 1–10, `catchRate` 0.01–1.0. Out-of-range values are a
   validation error, not silently clamped.

## Consequences

- The same Modster can be "rare" in one biome and "common" in another.
  The collection shows the rarest tier it was ever caught at.
- The table lives in one constants module so it's tunable in one place.
