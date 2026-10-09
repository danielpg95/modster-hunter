import { TIERS } from '../constants'
import type { Rarity } from '../content'

/**
 * The tier a Modster gets from its share of the biome's total weight
 * (decision 0004). Compared in whole numbers so a share of exactly 20% is
 * common, with no floating-point surprises.
 */
export function rarityTier(weight: number, totalWeight: number): Rarity {
  for (const { tier, minPercent } of TIERS) {
    if (weight * 100 >= totalWeight * minPercent) return tier
  }
  return 'legendary'
}
