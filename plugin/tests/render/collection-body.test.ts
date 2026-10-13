import { describe, expect, test } from 'claude-code/testing'
import { collectionBody } from '../../hooks/render'

// P3-02: list beside the detail when there's room, under it otherwise; the
// sprite beside the text, above it, or left out. The list is 36 columns.

const SUNMANE = { spriteColumns: 33, spriteRows: 15, detailRows: 7 }

describe('collectionBody', () => {
  test('a wide, tall dock puts the sprite beside the text, right of the list', () => {
    expect(collectionBody({ columns: 120, rows: 30, ...SUNMANE })).toEqual({ split: 'side', sprite: 'beside', listRows: 30, detailColumns: 82 })
  })

  test('a short inline pane keeps the list and the text, without the sprite', () => {
    expect(collectionBody({ columns: 120, rows: 6, ...SUNMANE })).toMatchObject({ split: 'side', sprite: 'none', listRows: 6 })
  })

  test('beside the list but too narrow for sprite and text across, the sprite goes above the text', () => {
    // 80 - 36 - 2 = 42 columns: 33 + 2 + 24 doesn't fit, 33 does; 15 + 7 rows fit in 30
    expect(collectionBody({ columns: 80, rows: 30, ...SUNMANE })).toMatchObject({ split: 'side', sprite: 'above' })
  })

  test('narrower than list and detail, the detail goes under the list, sprite and all when the list keeps 3 rows', () => {
    // 15 + 7 + 1 = 23 rows for the detail, 7 left for the list
    expect(collectionBody({ columns: 50, rows: 30, ...SUNMANE })).toEqual({ split: 'stack', sprite: 'above', listRows: 7, detailColumns: 50 })
  })

  test('stacked and short, the sprite gives way to the list', () => {
    expect(collectionBody({ columns: 50, rows: 20, ...SUNMANE })).toEqual({ split: 'stack', sprite: 'none', listRows: 12, detailColumns: 50 })
  })

  test('stacked and narrower than the sprite, no sprite', () => {
    expect(collectionBody({ columns: 30, rows: 40, ...SUNMANE }).sprite).toBe('none')
  })
})
