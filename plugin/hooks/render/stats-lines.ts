// The Stats tab's lines (P3-04): the totals, then one row per biome hunted in,
// most encounters first. Like the Biomes tab's odds, the rows aren't windowed;
// past the pane's rows the engine scrolls its body.

import { COLLECTION } from '../constants'
import type { BiomeStats, SessionStats } from '../store'
import type { BandLine } from './band-view'
import { fit } from './collection-list'

/** What the table needs to know about a loaded biome. */
export interface StatsBiome {
  name: string
  accentColor?: string
}

export const NO_STATS_TEXT = 'No hunts yet. Modsters show up while Claude works.'

const HEADINGS = ['Seen', 'Caught', 'Fled', 'Ran', 'Ratio'] as const

export function statsLines(stats: SessionStats | undefined, biomes: ReadonlyMap<string, StatsBiome>): BandLine[] {
  if (!stats || (stats.encounters === 0 && stats.turns === 0)) return [[{ text: NO_STATS_TEXT, dim: true }]]
  const lines: BandLine[] = [
    [...pair('Encounters', stats.encounters), gap(), ...pair('Caught', stats.catches), gap(), ...pair('Fled', stats.flees), gap(), ...pair('Ran', stats.runs)],
    [...pair('Catch ratio', ratio(stats)), gap(), ...pair('Turns', stats.turns)],
  ]
  const rows = Object.entries(stats.biomes)
    .filter(([, counts]) => counts.encounters > 0)
    .map(([id, counts]) => ({ id, counts, name: biomes.get(id)?.name ?? id }))
    .sort((a, b) => b.counts.encounters - a.counts.encounters || a.name.localeCompare(b.name))
  if (rows.length === 0) return lines
  lines.push([{ text: '' }])
  lines.push([{ text: fit('Biome', COLLECTION.biomeNameColumns), dim: true }, { text: HEADINGS.map(column).join(''), dim: true }])
  for (const { id, counts, name } of rows) {
    const biome = biomes.get(id)
    lines.push([
      biome ? { text: fit(name, COLLECTION.biomeNameColumns), ...(biome.accentColor ? { color: biome.accentColor } : {}) } : { text: fit(name, COLLECTION.biomeNameColumns), dim: true },
      { text: [counts.encounters, counts.catches, counts.flees, counts.runs, ratio(counts)].map(column).join('') },
    ])
  }
  return lines
}

/** `48%` of encounters caught; `—` before any encounter. */
export function ratio(counts: BiomeStats): string {
  return counts.encounters === 0 ? '—' : `${Math.round((counts.catches / counts.encounters) * 100)}%`
}

function pair(label: string, value: number | string): BandLine {
  return [{ text: `${label} `, dim: true }, { text: String(value), bold: true }]
}

function gap(): BandLine[number] {
  return { text: ' '.repeat(COLLECTION.gapColumns) }
}

function column(value: number | string): string {
  return String(value).padStart(COLLECTION.statColumns)
}
