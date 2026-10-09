import { TIERS } from '../constants'
import type { BiomeModsterEntry, Modster, Rarity } from '../content'
import { rarityTier } from './rarity-tier'

export interface CatchOdds {
  tier: Rarity
  /** Chance this Modster is the one that appears in its biome: weight ÷ total weight */
  encounterChance: number
  maxAttempts: number
  /** Chance a single throw catches it */
  catchRate: number
}

/**
 * Decision 0004: the tier comes from the Modster's `rarity`, or from its share
 * of the biome's weight. `maxAttempts` and `catchRate` come from the biome
 * entry, then the Modster file, then the tier default. `null` in the Modster
 * file means "use the default".
 */
export function resolveCatchOdds(entry: BiomeModsterEntry, modster: Modster, totalWeight: number): CatchOdds {
  const tier = modster.rarity ?? rarityTier(entry.weight, totalWeight)
  // Every Rarity has a row; the fallback only satisfies the type checker
  const defaults = TIERS.find((row) => row.tier === tier) ?? TIERS[3]
  return {
    tier,
    encounterChance: entry.weight / totalWeight,
    maxAttempts: entry.maxAttempts ?? modster.maxAttempts ?? defaults.maxAttempts,
    catchRate: entry.catchRate ?? modster.catchRate ?? defaults.catchRate,
  }
}
