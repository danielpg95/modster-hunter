import { TIERS } from '../constants'
import type { BiomeModsterEntry, Modster, Rarity } from '../content'
import { rarityTier } from './rarity-tier'

export interface CatchOdds {
  tier: Rarity
  maxAttempts: number
  /** Chance a single throw catches it */
  catchRate: number
}

/**
 * Decision 0004: `maxAttempts` and `catchRate` come from the biome entry, then
 * the Modster file, then the default of its tier (decision 0030 point 3).
 * `null` in the Modster file means "use the default".
 */
export function resolveCatchOdds(entry: BiomeModsterEntry, modster: Modster): CatchOdds {
  const tier = rarityTier(entry, modster)
  // Every Rarity has a row; the fallback only satisfies the type checker
  const defaults = TIERS.find((row) => row.tier === tier) ?? TIERS[3]
  return {
    tier,
    maxAttempts: entry.maxAttempts ?? modster.maxAttempts ?? defaults.maxAttempts,
    catchRate: entry.catchRate ?? modster.catchRate ?? defaults.catchRate,
  }
}
