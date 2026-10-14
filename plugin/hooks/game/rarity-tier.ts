import type { BiomeModsterEntry, Modster, Rarity } from '../content'

/** A Modster's tier in a biome: the entry's `rarity`, else the Modster's (decision 0030 point 3). */
export function rarityTier(entry: BiomeModsterEntry, modster: Modster): Rarity {
  return entry.rarity ?? modster.rarity
}
