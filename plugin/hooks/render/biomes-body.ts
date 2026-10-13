// How the Biomes tab splits its room (P3-03): the biome list beside the selected
// biome's odds, or above them when the pane is too narrow (a narrow dock). The
// odds rows aren't windowed; past the pane's rows the engine scrolls its body.
// The selected biome's scene goes on top when the list keeps its rows (0028 point 3).

import { COLLECTION } from '../constants'

export interface BiomesBodyInput {
  columns: number
  /** Rows under the summary line */
  rows: number
  /** The selected biome's scene, in rows; absent when it has none or can't draw one */
  sceneRows?: number
}

export interface BiomesBody {
  split: 'side' | 'stack'
  /** Rows the biome list gets, its count row included */
  listRows: number
  showScene: boolean
}

export function biomesBody(input: BiomesBodyInput): BiomesBody {
  const showScene = input.sceneRows !== undefined && input.rows - input.sceneRows >= COLLECTION.biomeSceneListRows
  const rows = showScene ? input.rows - (input.sceneRows ?? 0) : input.rows
  if (input.columns >= COLLECTION.biomeListColumns + COLLECTION.gapColumns + COLLECTION.oddsColumns) {
    return { split: 'side', listRows: Math.max(1, rows), showScene }
  }
  return { split: 'stack', listRows: Math.max(1, Math.min(rows, COLLECTION.biomeStackRows)), showScene }
}
