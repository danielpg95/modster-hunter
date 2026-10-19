// Turning a biome or Modster off and on from the pane (decision 0032): the
// key's label, a row dimmed and marked `off`, and the notes under the
// selected item. The pane can't delete files, so a user's own item says how
// to ask Claude instead (point 7).

import type { BandLine, BandSegment } from './band-view'

/** What the notes need to know about the selected item. */
export interface ItemMarks {
  /** Set aside in `settings.json` (0032 point 5) */
  isOff?: true
  /** Loaded from the user's folder (0032 point 7) */
  isYours?: true
}

export const TOGGLE_HOTKEY = 'o'

export function toggleLabel(marks: ItemMarks): string {
  return marks.isOff ? 'Turn on' : 'Turn off'
}

/** A list row as it reads when the item is off: every segment dimmed, then `off`; unchanged otherwise. */
export function offRow(row: BandLine, marks: ItemMarks): BandLine {
  if (!marks.isOff) return row
  const dimmed = row.map((segment): BandSegment => ('text' in segment ? { ...segment, dim: true } : segment))
  return [...dimmed, { text: ' off', dim: true }]
}

/** `Turned off` and the delete hint, each when it applies. */
export function itemNotes(kind: 'biome' | 'Modster' | 'catcher', id: string, marks: ItemMarks): BandLine[] {
  const lines: BandLine[] = []
  if (marks.isOff) lines.push([{ text: 'Turned off', bold: true }])
  if (marks.isYours) lines.push([{ text: `Yours · to delete it, ask Claude: "delete my ${kind} ${id}"`, dim: true }])
  return lines
}
