// The Biomes tab's rows (P3-03): a biome in the list, and one Modster's odds in
// the selected biome. Uncaught Modsters read `???` as in the Collection tab
// (0017 point 7), but their encounter % and tier still show.

import { COLLECTION, MODSTER_TYPES, TIERS } from '../constants'
import type { BandLine } from './band-view'
import type { BiomeEntry, BiomeOdds } from './biome-entries'
import { dexNumber } from './collection-entries'
import { fit } from './collection-list'

/** `▸ Whispering Forest 2/5 here`: the name in its accent color, caught of total, and the session's biome marked. */
export function biomeRow(entry: BiomeEntry, isSelected: boolean): BandLine {
  return [
    { text: isSelected ? '▸ ' : '  ', bold: true },
    { text: fit(entry.name, COLLECTION.biomeNameColumns), ...(isSelected ? { bold: true } : {}), ...(entry.accentColor ? { color: entry.accentColor } : {}) },
    { text: ` ${entry.caught}/${entry.odds.length}`, dim: true },
    ...(entry.isCurrent ? [{ text: ' here', bold: true } as const] : []),
  ]
}

/** `#001 Sproutling     40.0%  common    ×3`: the count is this biome's catches, left out when none. */
export function oddsRow(row: BiomeOdds, biomeId: string): BandLine {
  const here = row.record?.biomes[biomeId] ?? 0
  const tier = here > 0 ? row.tier.padEnd(TIER_COLUMNS) : row.tier
  const primary = row.types[0]
  return [
    { text: dexNumber(row).padEnd(5), dim: true },
    row.record
      ? { text: fit(row.name, COLLECTION.nameColumns), ...(primary ? { color: MODSTER_TYPES[primary] } : {}) }
      : { text: fit('???', COLLECTION.nameColumns), dim: true },
    { text: ` ${percent(row.encounterChance)}  ${tier}` },
    ...(here > 0 ? [{ text: ` ×${here}`, dim: true } as const] : []),
  ]
}

const TIER_COLUMNS = Math.max(...TIERS.map(({ tier }) => tier.length))

/** `40.0%`, right-aligned to `100.0%`: the same rounding as `formatOddsTable`. */
function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`.padStart('100.0%'.length)
}
