import type { Biome, Modster } from '../content'
import { encounterPool, tierChances } from './pick-encounter'
import { resolveCatchOdds, type CatchOdds } from './resolve-catch-odds'

export interface OddsRow extends CatchOdds {
  id: string
  name: string
  /** Chance an encounter here draws this Modster's tier */
  tierChance: number
  /** Chance this Modster is the one that appears: its tier's chance ÷ the Modsters in that tier */
  encounterChance: number
  /** Chance of catching it before it flees: 1 − (1 − catchRate) ^ maxAttempts */
  catchChance: number
}

/**
 * The odds of every Modster in a biome, in the biome's order (decision 0030).
 * Entries whose Modster isn't in `modsters` are left out, the same as
 * `checkBiomeReferences` does, and so is a tier left with no Modster.
 */
export function oddsTable(biome: Biome, modsters: ReadonlyMap<string, Modster>): OddsRow[] {
  const pool = encounterPool(biome, modsters)
  const chances = tierChances(pool)
  return pool.map(({ entry, modster, tier }) => {
    const odds = resolveCatchOdds(entry, modster)
    const tierChance = chances.get(tier) ?? 0
    const inTier = pool.filter((member) => member.tier === tier).length
    const catchChance = 1 - (1 - odds.catchRate) ** odds.maxAttempts
    return { id: entry.id, name: modster.name, ...odds, tierChance, encounterChance: tierChance / inTier, catchChance }
  })
}

const percent = (value: number): string => `${(value * 100).toFixed(1)}%`

/** Plain-text table for contributors balancing a biome: each tier's share and each Modster's own (decision 0030 point 7). */
export function formatOddsTable(rows: readonly OddsRow[]): string {
  const header = ['Modster', 'Tier', 'Tier share', 'Appears', 'Throws', 'Per throw', 'Caught']
  const body = rows.map((row) => [
    row.name,
    row.tier,
    percent(row.tierChance),
    percent(row.encounterChance),
    String(row.maxAttempts),
    percent(row.catchRate),
    percent(row.catchChance),
  ])
  const widths = header.map((title, column) => Math.max(title.length, ...body.map((cells) => cells[column]?.length ?? 0)))
  const line = (cells: string[]): string => cells.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join('  ').trimEnd()
  return [line(header), ...body.map(line)].join('\n')
}
