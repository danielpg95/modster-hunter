import { describe, expect, test } from 'claude-code/testing'
import { COLLECTION_TABS, tabRowWidth, tabWidth } from '../../hooks/render'

// P3-01: four tabs on hotkeys 1–4, drawn as plain Buttons.

describe('collectionTabs', () => {
  test('the tabs are Collection, Biomes, Stats and Settings on 1 to 4', () => {
    expect(COLLECTION_TABS.map((tab) => `${tab.hotkey}: ${tab.label}`)).toEqual(['1: Collection', '2: Biomes', '3: Stats', '4: Settings'])
  })

  test('a tab is as wide as its plain Button draws', () => {
    expect(COLLECTION_TABS.map(tabWidth)).toEqual([13, 9, 8, 11])
  })

  test('the row adds the gaps between tabs', () => {
    expect(tabRowWidth()).toBe(13 + 9 + 8 + 11 + 3 * 2)
  })
})
