// The collection pane's tabs (decision 0002, P3-01). There's no tab element in
// the mods API, so each tab is a plain Button whose hotkey fires while the pane
// holds the keys: `1: Collection  2: Biomes  3: Stats  4: Settings`.

import { COLLECTION } from '../constants'

export type CollectionTab = 'collection' | 'biomes' | 'stats' | 'settings'

export interface CollectionTabInfo {
  id: CollectionTab
  label: string
  hotkey: string
  /** What the tab says until its own task fills it (P3-02, P3-03, P3-04, P4-02) */
  placeholder: string
}

export const COLLECTION_TABS: readonly CollectionTabInfo[] = [
  { id: 'collection', label: 'Collection', hotkey: '1', placeholder: 'Your Modsters will show here.' },
  { id: 'biomes', label: 'Biomes', hotkey: '2', placeholder: 'Biomes and the Modsters in them will show here.' },
  { id: 'stats', label: 'Stats', hotkey: '3', placeholder: 'Your hunting stats will show here.' },
  // The settings live in /config for now (0023 point 7)
  { id: 'settings', label: 'Settings', hotkey: '4', placeholder: 'Change where the game shows in /config.' },
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
