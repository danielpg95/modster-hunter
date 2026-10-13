import { describe, expect, test } from 'claude-code/testing'
import { listRow, listWindow, moreText, type CollectionEntry } from '../../hooks/render'

// P3-02: the list's window keeps the selection in view; rows read `???` until caught.

const caught: CollectionEntry = {
  id: 'sproutling',
  name: 'Sproutling',
  number: 1,
  types: ['grass'],
  record: { v: 1, count: 3, shinyCount: 0, firstCaughtAt: 0, lastCaughtAt: 0, bestTier: 'rare', biomes: {} },
}
const text = (line: ReturnType<typeof listRow>) => line.map((segment) => ('text' in segment ? segment.text : '')).join('')

describe('collectionList', () => {
  test('everything shows when it fits, with no count row', () => {
    const window = listWindow(5, 2, 5)
    expect(window).toEqual({ start: 0, end: 5, above: 0, below: 0 })
    expect(moreText(window)).toBeUndefined()
  })

  test('a long list keeps the selected row in view and counts the rest', () => {
    // 30 entries in 6 rows: 5 shown and the count row
    for (const selected of [0, 1, 14, 28, 29]) {
      const window = listWindow(30, selected, 6)
      expect(window.end - window.start).toBe(5)
      expect(selected >= window.start && selected < window.end).toBe(true)
      expect(window.above + (window.end - window.start) + window.below).toBe(30)
    }
    expect(moreText(listWindow(30, 0, 6))).toBe('↓ 25 more')
    expect(moreText(listWindow(30, 14, 6))).toBe('↑ 12 · ↓ 13 more')
    expect(moreText(listWindow(30, 29, 6))).toBe('↑ 25 more')
  })

  test('one row still shows the selected entry', () => {
    expect(listWindow(30, 9, 1)).toEqual({ start: 9, end: 10, above: 9, below: 20 })
  })

  test('a caught row has the name in its type color, the count and best tier', () => {
    const row = listRow(caught, true)
    expect(text(row)).toBe('▸ #001 Sproutling     ×3 rare')
    expect(row.find((segment) => 'text' in segment && segment.text.startsWith('Sproutling'))).toMatchObject({ color: '#4caf50', bold: true })
  })

  test('an uncaught row shows only its number', () => {
    const { record, ...uncaught } = caught
    expect(text(listRow(uncaught, false))).toBe('  #001 ???')
  })

  test('a long name is cut to fit the list', () => {
    expect(text(listRow({ ...caught, name: 'Supercalifragilistic' }, false))).toBe('  #001 Supercalifrag… ×3 rare')
  })
})
