# 0030 — An encounter picks a tier first, then a Modster from that tier

- **Status:** Accepted
- **Date:** 2026-10-13
- **Decided by:** @danielpg95 (chosen after P3-04; details drafted by Claude)
- **Supersedes:** 0004 point 1, 0007 point 1

## Context

Today one draw picks the Modster: its chance is `weight ÷ sum of weights` in
the biome ([0007](0007-content-model.md) point 1), and its tier comes from that
share unless its `rarity` says otherwise ([0004](0004-attempts-and-catch-rate.md)
point 1). So adding Modsters to a biome lowers every other Modster's chance and
can push them into another tier: three uncommons at weight 30 drop below 1%,
and become legendary, once 100 commons at weight 100 join them.

The built-in biomes already land close to one set of tier shares (by today's
rules):

| Biome | Common | Uncommon | Rare | Legendary |
| --- | --- | --- | --- | --- |
| Crystal Grotto | 72.1% | 21.6% | 5.8% | 0.5% |
| Whispering Forest | 80.0% | 16.0% | 3.2% | 0.8% |
| Dustwind Expanse | 80.6% | 16.1% | 3.2% | none |
| Saltbreeze Bay | 80.6% | 16.1% | 3.2% | none |

There are no players yet, so content can change without a migration.

## Options

1. **Keep weights (today).** Fine-grained, but every addition shifts the other
   Modsters' odds and tiers.
2. **Tier first, then equal within the tier.** A tier's odds never depend on
   how many Modsters other tiers hold; rank alone says how rare a Modster is.
3. **Tier first, then by weight within the tier.** Keeps a knob inside a tier,
   but two knobs interact and are harder to balance.

## Decision

Option 2.

1. **The pick.** An encounter draws a tier with the tier weights, then one
   Modster of that tier in the biome, each equally likely.
2. **Tier weights**, the same in every biome, in `constants.ts`: common 76,
   uncommon 19, rare 4.5, legendary 0.5. A tier with no Modster in the biome is
   left out and the others keep their proportions (Dustwind Expanse: common
   76 ÷ 99.5 ≈ 76.4%).
3. **Where the tier comes from.** The Modster file's `rarity` is required. A
   biome entry may set `rarity` too, which wins, the same precedence as
   `maxAttempts` and `catchRate` (0004 point 4). The weight-share rule of 0004
   point 1 is gone.
4. **No more `weight`.** Biome entries drop `weight`; it becomes an unknown
   field. The built-in Modsters get `rarity` set to the tier they compute to
   today. `schemaVersion` stays 1: with no players yet, nothing needs to tell
   old files apart (an exception to 0007's bump rule, for this change only).
5. **Catch odds are unchanged.** Throws and the chance per throw still come
   from the tier (0004 points 2–5).
6. **A warning for lopsided pools.** The content check (validator and the
   helper's `check`) warns when a Modster's chance to appear in a biome is below
   that of a Modster in a rarer tier there; for example, 100 commons share 76%,
   so each one appears less often than a lone uncommon.
7. **Show both shares.** The Biomes tab and `formatOddsTable` show a Modster's
   tier share and its own share, like `common 76% · 25.3% each`.
8. **Shinies are out of scope**: P5-01 decides how they roll.

## Consequences

- Adding a Modster only thins its own tier. Balancing a biome means choosing
  each Modster's tier.
- The built-in biomes play almost the same. Whispering Forest's legendary drops
  from 0.8% to 0.5%.
- The pick uses two random draws instead of one, so scripted-random tests in
  `plugin/tests/game/` need new sequences.
- To change: `pickWeighted` callers, `rarityTier`, `resolveCatchOdds`,
  `oddsTable`/`formatOddsTable`, the biome validator, `docs/CONTENT_FORMAT.md`,
  the `add-biome`/`add-modster` skills, the user content skill and its
  `reference/format.md`. Roadmap task P5-16.
