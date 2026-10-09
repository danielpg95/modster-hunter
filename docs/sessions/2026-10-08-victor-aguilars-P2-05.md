# Session — 2026-10-08 — @victor-aguilars — P2-05 Rarity, attempts and catch-rate resolution

- **Task:** P2-05 — Rarity, attempts and catch-rate resolution
- **Branch:** `p2-05-catch-odds`
- **Status at end:** done
- **Last commit:** see `git log` on the branch (handoff commit follows the P2-05 code commit)

## Goal for this session

Claim P2-05 (PR #19) and finish both "done when" items.

## Done

- `plugin/hooks/constants.ts`: `TIERS`, the 0004 table (`minPercent`, default `maxAttempts`, `catchRate`), checked common → legendary.
- `plugin/hooks/game/` (pure):
  - `rarity-tier.ts`: `rarityTier(weight, totalWeight)`; compares `weight * 100 >= total * minPercent` so exact thresholds (7/35 = 20%) never miss to float error.
  - `resolve-catch-odds.ts`: `resolveCatchOdds(entry, modster, totalWeight)` → `{ tier, encounterChance, maxAttempts, catchRate }`. Tier: Modster `rarity`, else from weight. Values: biome entry → Modster → tier default; `null` = default.
  - `odds-table.ts`: `oddsTable(biome, modstersById)` rows (adds `catchChance` = 1 − (1 − rate)^attempts) and `formatOddsTable(rows)` plain text for contributors.
- Tests in `plugin/tests/game/` (19 new) and fixture `plugin/tests/fixtures/modster-named.ts`. Verified: typecheck clean, `npm test` 149 pass, `validate --strict` passes (also once with `register.ts` importing `./game`, reverted).

## Decisions made

- The "odds table for each built-in biome" item can't be met before P2-09 adds biomes. @victor-aguilars chose: ship and test the helper now on the CONTENT_FORMAT example, tick the item with that wording, and add a "done when" to P2-09 to print and check it per built-in biome.

## Problems and findings

- In the CONTENT_FORMAT example biome, Pinewraith (weight 4 of 79 = 5.1%) resolves as **uncommon**, not rare, and with the entry's `maxAttempts: 5` it's the easiest to catch (88.4%, vs 87.5% for the common Sproutling). Weights near tier edges flip tiers; P2-09 should read the table, not guess.
- Branch protection on `main` now requires the "Tracking and content checks" CI job; claim PRs wait for it before merging.

## Next steps

1. P2-06 (encounter state machine, size L) is now claimable: build it on `resolveCatchOdds` for attempts and catch rate.
2. P2-03 (content loader) can run in parallel; it should call `checkBiomeReferences` before anything uses `oddsTable`.

## Open questions

- Should the add-biome / add-modster skills call `formatOddsTable` instead of computing the table by hand? — @danielpg95

## Found along the way

- The CONTENT_FORMAT example biome's weights don't give the tiers they seem to intend (see findings); harmless in docs, but P2-09 shouldn't copy them.
