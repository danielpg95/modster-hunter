// How the Collection tab splits its room (P3-02): the list on the left and the
// selected Modster on the right, or the detail under the list when the pane is
// too narrow for both (a narrow dock). The sprite goes beside the detail's text,
// above it, or is left out when neither fits (inline panes are short).
// It's sized from the pane and fixed boxes only, never the selected Modster, so
// the layout holds still while scrolling.

import { COLLECTION } from '../constants'

export interface CollectionBodyInput {
  columns: number
  /** Rows for the list and the detail together */
  rows: number
  /** The sprite box in cells, as big as the largest loaded sprite: its width, and half its height (0012) */
  spriteColumns: number
  spriteRows: number
  /** Rows the detail's text always takes */
  detailRows: number
}

export interface CollectionBody {
  /** `side`: detail right of the list; `stack`: detail under it */
  split: 'side' | 'stack'
  sprite: 'beside' | 'above' | 'none'
  /** Rows the list gets, its count row included */
  listRows: number
  /** Columns the detail gets, sprite included */
  detailColumns: number
  /** Columns the detail's text gets */
  textColumns: number
}

/** A stacked list keeps at least this many rows, or the sprite gives way */
const STACK_LIST_MIN_ROWS = 3

export function collectionBody(input: CollectionBodyInput): CollectionBody {
  const sideColumns = input.columns - COLLECTION.listColumns - COLLECTION.gapColumns
  if (sideColumns >= COLLECTION.detailMinColumns) {
    const sprite = sideSprite(sideColumns, input)
    const textColumns = sprite === 'beside' ? sideColumns - input.spriteColumns - COLLECTION.gapColumns : sideColumns
    return { split: 'side', sprite, listRows: Math.max(1, input.rows), detailColumns: sideColumns, textColumns }
  }
  // Under the list, after a blank row; the sprite goes above the text if the list keeps its rows
  const textRows = input.detailRows + 1
  const spriteRows = input.spriteRows + textRows
  const spriteFits = input.spriteColumns <= input.columns && input.rows - spriteRows >= STACK_LIST_MIN_ROWS
  return {
    split: 'stack',
    sprite: spriteFits ? 'above' : 'none',
    listRows: Math.max(1, input.rows - (spriteFits ? spriteRows : textRows)),
    detailColumns: input.columns,
    textColumns: input.columns,
  }
}

/** Beside the text when both fit across, above it when they fit down, else none. */
function sideSprite(columns: number, input: CollectionBodyInput): CollectionBody['sprite'] {
  if (input.spriteColumns + COLLECTION.gapColumns + COLLECTION.detailMinColumns <= columns && input.spriteRows <= input.rows) return 'beside'
  if (input.spriteColumns <= columns && input.spriteRows + input.detailRows <= input.rows) return 'above'
  return 'none'
}
