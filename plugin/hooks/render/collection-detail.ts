// The selected Modster's details in the Collection tab (P3-02): the dex
// (decision 0017, both types primary first per 0022), where it lives, and its
// catches. Until the first catch only the number shows; the rest reads `???`.

import { MODSTER_TYPES } from '../constants'
import type { ModsterDex } from '../content'
import type { BandLine, BandSegment } from './band-view'
import { dexNumber, type CollectionEntry } from './collection-entries'

export interface DetailInput {
  entry: CollectionEntry
  dex?: ModsterDex
  /** Names of the biomes that list it (0017 point 5: habitat comes from the biomes) */
  habitat: string[]
}

const UNKNOWN = '???'

export function detailLines(input: DetailInput): BandLine[] {
  const { entry, dex } = input
  const number = { text: `  ${dexNumber(entry)}`, dim: true } as const
  const record = entry.record
  if (!record) {
    return [
      [{ text: UNKNOWN, bold: true }, number],
      [{ text: UNKNOWN, dim: true }],
      [{ text: 'Not caught yet', dim: true }],
    ]
  }
  const primary = entry.types[0]
  const lines: BandLine[] = [[{ text: entry.name, bold: true, ...(primary ? { color: MODSTER_TYPES[primary] } : {}) }, number]]
  const kind: BandSegment[] = entry.types.flatMap((type, at) => [
    ...(at > 0 ? [{ text: ' · ', dim: true } as const] : []),
    { text: type, color: MODSTER_TYPES[type] },
  ])
  if (dex?.category) kind.push({ text: `${kind.length > 0 ? ' · ' : ''}${dex.category}`, dim: true })
  if (kind.length > 0) lines.push(kind)
  const size = [dex?.heightM === undefined ? '' : `${dex.heightM} m`, dex?.weightKg === undefined ? '' : `${dex.weightKg} kg`].filter(Boolean)
  if (size.length > 0) lines.push([{ text: size.join(' · '), dim: true }])
  if (dex?.entry) lines.push([{ text: dex.entry }])
  lines.push([{ text: `Caught ×${record.count} · best ${record.bestTier}` }])
  lines.push([{ text: `First ${day(record.firstCaughtAt)} · last ${day(record.lastCaughtAt)}`, dim: true }])
  if (input.habitat.length > 0) lines.push([{ text: `Lives in ${input.habitat.join(', ')}`, dim: true }])
  return lines
}

/** `YYYY-MM-DD` in the person's own time zone. */
function day(ms: number): string {
  const date = new Date(ms)
  const two = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`
}
