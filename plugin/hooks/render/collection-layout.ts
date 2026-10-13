// Where the collection pane puts its tabs and hint (P3-01). Inline the pane sits
// above the prompt and gets few rows, so the tabs share the header row when they
// fit; docked it's tall and maybe narrow, so they get a row, or a row each.

import { COLLECTION } from '../constants'
import { tabRowWidth } from './collection-tabs'

export interface CollectionLayoutInput {
  placement: 'dock' | 'inline'
  isFocused: boolean
  /** The pane's `bodyColumns` */
  columns: number
  /** Columns the header's title (the biome name) takes */
  titleColumns: number
}

export interface CollectionLayout {
  /** `beside` the title on the header row, on a `row` of their own, or a `column` of one per row */
  tabs: 'beside' | 'row' | 'column'
  /** Ends the header row, if it fits after the title (and the tabs beside it) */
  hint?: string
}

// Esc closes this pane (closeOnEscape), unlike the encounter pane's (0024)
const CLOSE = ' · Esc: close'
const USE = ' · ctrl+x tab to use'

export function collectionLayout(input: CollectionLayoutInput): CollectionLayout {
  const row = tabRowWidth()
  const besideColumns = input.titleColumns + COLLECTION.tabGapColumns + row
  const tabs = input.placement === 'inline' && besideColumns <= input.columns ? 'beside' : row <= input.columns ? 'row' : 'column'
  const left = input.columns - (tabs === 'beside' ? besideColumns : input.titleColumns)
  const hint = input.isFocused ? CLOSE : USE
  return hint.length <= left ? { tabs, hint } : { tabs }
}
