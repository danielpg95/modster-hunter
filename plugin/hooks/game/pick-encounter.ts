import { TIERS } from '../constants'
import type { Biome, BiomeModsterEntry, Modster, Rarity } from '../content'
import { pickWeighted } from './pick-weighted'
import type { RandomSource } from './random-source'
import { rarityTier } from './rarity-tier'

export interface PoolMember {
  entry: BiomeModsterEntry
  modster: Modster
  tier: Rarity
}

/** The biome's Modsters that loaded, in the biome's order, each with its tier. */
export function encounterPool(biome: Biome, modsters: ReadonlyMap<string, Modster>): PoolMember[] {
  return biome.modsters.flatMap((entry) => {
    const modster = modsters.get(entry.id)
    return modster ? [{ entry, modster, tier: rarityTier(entry, modster) }] : []
  })
}

/** The tiers with a Modster in the pool, with their weights (decision 0030 point 2). */
function presentTiers(pool: readonly PoolMember[]) {
  return TIERS.filter((row) => pool.some((member) => member.tier === row.tier))
}

/**
 * Decision 0030 point 1: a tier by the tier weights, then one Modster of that
 * tier, each equally likely. Two draws; undefined when the pool is empty.
 */
export function pickEncounter(pool: readonly PoolMember[], random: RandomSource): PoolMember | undefined {
  const row = pickWeighted(presentTiers(pool), random)
  if (!row) return undefined
  const members = pool.filter((member) => member.tier === row.tier)
  // Clamp: a source returning exactly 1 (out of contract) still picks the last one
  return members[Math.min(Math.floor(random() * members.length), members.length - 1)]
}

/** Each present tier's chance to be drawn; tiers with no Modster are left out. */
export function tierChances(pool: readonly PoolMember[]): Map<Rarity, number> {
  const rows = presentTiers(pool)
  const total = rows.reduce((sum, row) => sum + row.weight, 0)
  return new Map(rows.map((row) => [row.tier, row.weight / total]))
}
