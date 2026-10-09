import type { Biome, Modster } from '../content'
import { resolveCatchOdds, type CatchOdds } from './resolve-catch-odds'

export interface OddsRow extends CatchOdds {
  id: string
  name: string
  weight: number
  /** Chance of catching it before it flees: 1 − (1 − catchRate) ^ maxAttempts */
  catchChance: number
}

/**
 * The odds of every Modster in a biome, in the biome's order. Entries whose
 * Modster isn't in `modsters` are left out, and their weight with them,
 * the same as `checkBiomeReferences` does.
 */
export function oddsTable(biome: Biome, modsters: ReadonlyMap<string, Modster>): OddsRow[] {
  const present = biome.modsters.filter((entry) => modsters.has(entry.id))
  const totalWeight = present.reduce((sum, entry) => sum + entry.weight, 0)
  return present.flatMap((entry) => {
    const modster = modsters.get(entry.id)
    if (!modster) return []
    const odds = resolveCatchOdds(entry, modster, totalWeight)
    const catchChance = 1 - (1 - odds.catchRate) ** odds.maxAttempts
    return [{ id: entry.id, name: modster.name, weight: entry.weight, ...odds, catchChance }]
  })
}

const percent = (value: number): string => `${(value * 100).toFixed(1)}%`

/** Plain-text table for contributors balancing a biome (add-biome / add-modster skills). */
export function formatOddsTable(rows: readonly OddsRow[]): string {
  const header = ['Modster', 'Weight', 'Appears', 'Tier', 'Throws', 'Per throw', 'Caught']
  const body = rows.map((row) => [
    row.name,
    String(row.weight),
    percent(row.encounterChance),
    row.tier,
    String(row.maxAttempts),
    percent(row.catchRate),
    percent(row.catchChance),
  ])
  const widths = header.map((title, column) => Math.max(title.length, ...body.map((cells) => cells[column]?.length ?? 0)))
  const line = (cells: string[]): string => cells.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join('  ').trimEnd()
  return [line(header), ...body.map(line)].join('\n')
}
