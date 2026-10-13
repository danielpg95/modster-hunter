// What the Biomes tab lists (P3-03): every loaded biome by name, the session's
// one marked, each with its Modsters' odds straight from the P2-05 resolver
// (`oddsTable`), in the biome's own order.

import type { LoadedBiome, LoadedModster, ModsterType } from '../content'
import { oddsTable, type OddsRow } from '../game'
import type { CaughtRecord } from '../store'

export interface BiomeOdds extends OddsRow {
  number?: number
  types: ModsterType[]
  /** Undefined until the first catch, in any biome */
  record?: CaughtRecord
}

export interface BiomeEntry {
  id: string
  name: string
  accentColor?: string
  /** The session's biome (decision 0006) */
  isCurrent: boolean
  /** How many of its Modsters were caught, in any biome */
  caught: number
  odds: BiomeOdds[]
}

export function biomeEntries(
  biomes: Iterable<LoadedBiome>,
  modsters: ReadonlyMap<string, LoadedModster>,
  records: ReadonlyMap<string, CaughtRecord>,
  currentId: string | undefined,
): BiomeEntry[] {
  const plain = new Map([...modsters].map(([id, loaded]) => [id, loaded.modster]))
  const entries = [...biomes].map(({ biome }): BiomeEntry => {
    const odds = oddsTable(biome, plain).map((row): BiomeOdds => {
      const dex = plain.get(row.id)?.dex
      const record = records.get(row.id)
      return { ...row, ...(dex?.number === undefined ? {} : { number: dex.number }), types: dex?.types ?? [], ...(record ? { record } : {}) }
    })
    return {
      id: biome.id,
      name: biome.name,
      ...(biome.accentColor ? { accentColor: biome.accentColor } : {}),
      isCurrent: biome.id === currentId,
      caught: odds.filter((row) => row.record).length,
      odds,
    }
  })
  return entries.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
}
