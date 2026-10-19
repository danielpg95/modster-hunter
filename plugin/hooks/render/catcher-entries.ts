// The Catchers tab (decision 0035 point 9, P5-30): every loaded catcher, the
// one in use marked, the player's own marked `yours`, and the Modster its
// preview plays on.

import { CATCH, COLLECTION } from '../constants'
import type { Catcher } from '../content'
import type { CaughtRecord } from '../store'
import type { BandLine } from './band-view'
import { fit } from './collection-list'

export interface CatcherEntry {
  id: string
  name: string
  description?: string
  isInUse: boolean
  /** Loaded from the user's folder (0032 point 7) */
  isYours?: true
}

/** The default catcher first, then the rest by name. */
export function catcherEntries(catchers: Iterable<Catcher>, inUseId: string | undefined, yours: ReadonlySet<string>): CatcherEntry[] {
  const rank = (catcher: Catcher) => (catcher.id === CATCH.defaultCatcher ? 0 : 1)
  return [...catchers]
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
    .map((catcher) => ({
      id: catcher.id,
      name: catcher.name,
      ...(catcher.description ? { description: catcher.description } : {}),
      isInUse: catcher.id === inUseId,
      ...(yours.has(catcher.id) ? { isYours: true as const } : {}),
    }))
}

/** `▸ Glass jar          ✓ in use`, or `yours` for the player's own. */
export function catcherRow(entry: CatcherEntry, isSelected: boolean): BandLine {
  return [
    { text: isSelected ? '▸ ' : '  ', bold: true },
    { text: fit(entry.name, COLLECTION.catcherNameColumns), ...(isSelected ? { bold: true } : {}) },
    ...(entry.isInUse ? [{ text: ' ✓ in use', bold: true } as const] : []),
    ...(entry.isYours ? [{ text: ' yours', dim: true } as const] : []),
  ]
}

/** The Modster the preview plays on: the one caught most recently, or undefined when none is caught yet. */
export function previewModsterId(records: ReadonlyMap<string, CaughtRecord>, loaded: ReadonlySet<string>): string | undefined {
  let best: { id: string; at: number } | undefined
  for (const [id, record] of records) {
    if (!loaded.has(id)) continue
    if (!best || record.lastCaughtAt > best.at) best = { id, at: record.lastCaughtAt }
  }
  return best?.id
}
