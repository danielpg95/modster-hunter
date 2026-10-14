// What the Collection tab lists (P3-02): every loaded Modster, built-ins by dex
// number, then the rest by name (decision 0017 point 3: only built-ins are numbered).
// Records of Modsters that no longer load aren't listed.

import type { LoadedModster, ModsterType } from '../content'
import type { CaughtRecord } from '../store'
import type { ItemMarks } from './item-notes'

/** Which listed ids are off or the user's own (decision 0032) */
export interface EntryMarks {
  off?: ReadonlySet<string>
  yours?: ReadonlySet<string>
}

export interface CollectionEntry extends ItemMarks {
  id: string
  name: string
  number?: number
  types: ModsterType[]
  /** Undefined until the first catch */
  record?: CaughtRecord
}

export function collectionEntries(modsters: Iterable<LoadedModster>, records: ReadonlyMap<string, CaughtRecord>, marks: EntryMarks = {}): CollectionEntry[] {
  const entries: CollectionEntry[] = []
  for (const { modster } of modsters) {
    const record = records.get(modster.id)
    entries.push({
      id: modster.id,
      name: modster.name,
      ...(modster.dex?.number === undefined ? {} : { number: modster.dex.number }),
      types: modster.dex?.types ?? [],
      ...(record ? { record } : {}),
      ...entryMarks(modster.id, marks),
    })
  }
  return entries.sort((a, b) => {
    if (a.number !== undefined && b.number !== undefined) return a.number - b.number
    if (a.number !== undefined) return -1
    if (b.number !== undefined) return 1
    return a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
  })
}

/** The marks for one id, set only when true (an optional `true`-only field). */
export function entryMarks(id: string, marks: EntryMarks): ItemMarks {
  return { ...(marks.off?.has(id) ? { isOff: true } : {}), ...(marks.yours?.has(id) ? { isYours: true } : {}) }
}

/** `#001`, or `#—` for a Modster without a number. */
export function dexNumber(entry: CollectionEntry): string {
  return entry.number === undefined ? '#—' : `#${String(entry.number).padStart(3, '0')}`
}
