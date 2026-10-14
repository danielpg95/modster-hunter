// The Biomes tab's rows (P3-03): a biome in the list, and the selected biome's
// odds, a header per tier with its share, then each of its Modsters with its own
// share (decision 0030 point 7). Uncaught Modsters read `???` as in the
// Collection tab (0017 point 7), but their encounter % still shows.

import { COLLECTION, MODSTER_TYPES, TIERS } from '../constants'
import type { BandLine } from './band-view'
import type { BiomeEntry, BiomeOdds, TierSection } from './biome-entries'
import { dexNumber } from './collection-entries'
import { fit } from './collection-list'
import { offRow } from './item-notes'

/** `▸ Whispering Forest 2/5 here`: the name in its accent color, caught of total, and the session's biome marked; dimmed with `off` when off (0032). */
export function biomeRow(entry: BiomeEntry, isSelected: boolean): BandLine {
  const row: BandLine = [
    { text: isSelected ? '▸ ' : '  ', bold: true },
    { text: fit(entry.name, COLLECTION.biomeNameColumns), ...(isSelected ? { bold: true } : {}), ...(entry.accentColor ? { color: entry.accentColor } : {}) },
    { text: ` ${entry.caught}/${entry.odds.length}`, dim: true },
    ...(entry.isCurrent ? [{ text: ' here', bold: true } as const] : []),
  ]
  return offRow(row, entry)
}

/** `common     76.4%`: a tier section's header, its share right-aligned under the Modsters' own. */
export function tierRow(section: TierSection): BandLine {
  return [
    { text: section.tier.padEnd(TIER_COLUMNS), bold: true },
    { text: ` ${percent(section.tierChance).padStart(TIER_SHARE_COLUMNS)}`, dim: true },
  ]
}

/** `#001 Sproutling      25.3%  ×3`: the count is this biome's catches, left out when none. */
export function oddsRow(row: BiomeOdds, biomeId: string): BandLine {
  const here = row.record?.biomes[biomeId] ?? 0
  const primary = row.types[0]
  return [
    { text: dexNumber(row).padEnd(5), dim: true },
    row.record
      ? { text: fit(row.name, COLLECTION.nameColumns), ...(primary ? { color: MODSTER_TYPES[primary] } : {}) }
      : { text: fit('???', COLLECTION.nameColumns), dim: true },
    { text: ` ${percent(row.encounterChance)}` },
    ...(here > 0 ? [{ text: `  ×${here}`, dim: true } as const] : []),
  ]
}

const TIER_COLUMNS = Math.max(...TIERS.map(({ tier }) => tier.length))
// Lines the tier share up with the odds rows' %: dex number + name + space, less the tier and its space
const TIER_SHARE_COLUMNS = 5 + COLLECTION.nameColumns + 1 + '100.0%'.length - TIER_COLUMNS - 1

/** `40.0%`, right-aligned to `100.0%`: the same rounding as `formatOddsTable`. */
function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`.padStart('100.0%'.length)
}
