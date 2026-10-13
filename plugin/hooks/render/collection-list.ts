// The Collection tab's list (P3-02): which rows show in the room there is, and
// how each reads. The window keeps the selected row in view; a last row counts
// what's above and below.

import { COLLECTION, MODSTER_TYPES } from '../constants'
import type { BandLine } from './band-view'
import { dexNumber, type CollectionEntry } from './collection-entries'

export interface ListWindow {
  start: number
  /** One past the last shown entry */
  end: number
  above: number
  below: number
}

/** The entries that fit in `rows`, the selected one in view; the count row takes one row when not all fit. */
export function listWindow(count: number, selected: number, rows: number): ListWindow {
  if (count <= rows) return { start: 0, end: count, above: 0, below: 0 }
  const shown = Math.max(1, rows - 1)
  const at = Math.min(Math.max(0, selected), count - 1)
  const start = Math.min(Math.max(0, at - Math.floor(shown / 2)), count - shown)
  return { start, end: start + shown, above: start, below: count - start - shown }
}

/** `↑ 3 · ↓ 18 more`, or undefined when everything shows. */
export function moreText(window: ListWindow): string | undefined {
  const parts = [window.above > 0 ? `↑ ${window.above}` : '', window.below > 0 ? `↓ ${window.below}` : ''].filter(Boolean)
  return parts.length > 0 ? `${parts.join(' · ')} more` : undefined
}

/** One row: marker, number, name in its primary type's color, count and best tier; `???` until caught (0017 point 7). */
export function listRow(entry: CollectionEntry, isSelected: boolean): BandLine {
  const marker = isSelected ? '▸ ' : '  '
  const number = dexNumber(entry).padEnd(5)
  if (!entry.record) return [{ text: marker, bold: true }, { text: `${number}???`, dim: true }]
  const primary = entry.types[0]
  const name = fit(entry.name, COLLECTION.nameColumns)
  return [
    { text: marker, bold: true },
    { text: number, dim: true },
    { text: name, ...(isSelected ? { bold: true } : {}), ...(primary ? { color: MODSTER_TYPES[primary] } : {}) },
    { text: ` ×${entry.record.count} ${entry.record.bestTier}`, dim: true },
  ]
}

/** `text` cut to `columns` with an ellipsis, padded to exactly `columns`. */
function fit(text: string, columns: number): string {
  return text.length > columns ? `${text.slice(0, columns - 1)}…` : text.padEnd(columns)
}
