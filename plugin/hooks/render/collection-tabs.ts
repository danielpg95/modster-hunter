// The collection pane's tabs (decision 0002, P3-01). There's no tab element in
// the mods API, so each tab is a plain Button whose hotkey fires while the pane
// holds the keys: `1: Collection  2: Biomes  3: Stats  4: Catchers  5: Settings`.
// Settings stays last (asked by @danielpg95 in P5-30).

import { COLLECTION } from '../constants'

export type CollectionTab = 'collection' | 'biomes' | 'stats' | 'catchers' | 'settings'

export interface CollectionTabInfo {
  id: CollectionTab
  label: string
  hotkey: string
}

export const COLLECTION_TABS: readonly CollectionTabInfo[] = [
  { id: 'collection', label: 'Collection', hotkey: '1' },
  { id: 'biomes', label: 'Biomes', hotkey: '2' },
  { id: 'stats', label: 'Stats', hotkey: '3' },
  { id: 'catchers', label: 'Catchers', hotkey: '4' },
  { id: 'settings', label: 'Settings', hotkey: '5' },
]

/** How wide one plain tab Button draws: `1: Collection`. */
export function tabWidth(tab: CollectionTabInfo): number {
  return tab.hotkey.length + 2 + tab.label.length
}

/** How wide the tabs draw on one row, with the gaps between them. */
export function tabRowWidth(): number {
  const buttons = COLLECTION_TABS.reduce((sum, tab) => sum + tabWidth(tab), 0)
  return buttons + COLLECTION.tabGapColumns * (COLLECTION_TABS.length - 1)
}
