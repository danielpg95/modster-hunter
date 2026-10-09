import type { Rarity } from '../content'

/** `caught:<modsterId>` (decision 0009). */
export interface CaughtRecord {
  v: 1
  count: number
  shinyCount: number
  /** ms since epoch */
  firstCaughtAt: number
  lastCaughtAt: number
  /** The rarest tier this Modster was ever caught at (0004: tiers depend on the biome) */
  bestTier: Rarity
  /** Catches per biome id */
  biomes: Record<string, number>
}

export interface Catch {
  tier: Rarity
  biomeId: string
  at: number
  shiny: boolean
}

export const caughtKey = (modsterId: string): string => `caught:${modsterId}`

const TIER_ORDER: readonly Rarity[] = ['common', 'uncommon', 'rare', 'legendary']

/**
 * The stored value as a current record (the "migration on read" of 0009), or
 * undefined when there is none or it isn't one we can read.
 */
export function readCaughtRecord(raw: unknown): CaughtRecord | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const value = raw as Partial<CaughtRecord>
  // v1 is the only version so far; a future v2 migrates here
  if (value.v !== 1) return undefined
  const count = whole(value.count)
  const tier = TIER_ORDER.find((known) => known === value.bestTier)
  if (count === undefined || !tier) return undefined
  const biomes: Record<string, number> = {}
  if (typeof value.biomes === 'object' && value.biomes !== null) {
    for (const [id, n] of Object.entries(value.biomes)) {
      const kept = whole(n)
      if (kept !== undefined) biomes[id] = kept
    }
  }
  return {
    v: 1,
    count,
    shinyCount: whole(value.shinyCount) ?? 0,
    firstCaughtAt: whole(value.firstCaughtAt) ?? 0,
    lastCaughtAt: whole(value.lastCaughtAt) ?? 0,
    bestTier: tier,
    biomes,
  }
}

/** The record after one more catch; never changes `record`. */
export function addCatch(record: CaughtRecord | undefined, caught: Catch): CaughtRecord {
  if (!record) {
    return {
      v: 1,
      count: 1,
      shinyCount: caught.shiny ? 1 : 0,
      firstCaughtAt: caught.at,
      lastCaughtAt: caught.at,
      bestTier: caught.tier,
      biomes: { [caught.biomeId]: 1 },
    }
  }
  return {
    ...record,
    count: record.count + 1,
    shinyCount: record.shinyCount + (caught.shiny ? 1 : 0),
    firstCaughtAt: Math.min(record.firstCaughtAt, caught.at),
    lastCaughtAt: Math.max(record.lastCaughtAt, caught.at),
    bestTier: TIER_ORDER.indexOf(caught.tier) > TIER_ORDER.indexOf(record.bestTier) ? caught.tier : record.bestTier,
    biomes: { ...record.biomes, [caught.biomeId]: (record.biomes[caught.biomeId] ?? 0) + 1 },
  }
}

function whole(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : undefined
}
