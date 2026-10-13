// How the Biomes tab splits its room (P3-03): the biome list beside the selected
// biome's odds, or above them when the pane is too narrow (a narrow dock). The
// odds rows aren't windowed; past the pane's rows the engine scrolls its body.

import { COLLECTION } from '../constants'

export interface BiomesBody {
  split: 'side' | 'stack'
  /** Rows the biome list gets, its count row included */
  listRows: number
}

export function biomesBody(columns: number, rows: number): BiomesBody {
  if (columns >= COLLECTION.biomeListColumns + COLLECTION.gapColumns + COLLECTION.oddsColumns) return { split: 'side', listRows: Math.max(1, rows) }
  return { split: 'stack', listRows: Math.max(1, Math.min(rows, COLLECTION.biomeStackRows)) }
}
