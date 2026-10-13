import { describe, expect, test } from 'claude-code/testing'
import { collectionLayout } from '../../hooks/render'

// P3-01: where the tabs go by placement and width, and which hint fits.
// The tab row is 47 columns; "Whispering Forest" is 17.

const TITLE = 17

describe('collectionLayout', () => {
  test('inline and wide, the tabs share the header row', () => {
    expect(collectionLayout({ placement: 'inline', isFocused: true, columns: 120, titleColumns: TITLE })).toEqual({ tabs: 'beside', hint: ' · Esc: close' })
  })

  test('inline but too narrow to share, the tabs get their own row', () => {
    expect(collectionLayout({ placement: 'inline', isFocused: true, columns: 60, titleColumns: TITLE }).tabs).toBe('row')
  })

  test('docked, the tabs get their own row even when there is room beside the title', () => {
    expect(collectionLayout({ placement: 'dock', isFocused: true, columns: 120, titleColumns: TITLE }).tabs).toBe('row')
  })

  test('a dock narrower than the row puts one tab per row', () => {
    expect(collectionLayout({ placement: 'dock', isFocused: true, columns: 46, titleColumns: TITLE }).tabs).toBe('column')
    expect(collectionLayout({ placement: 'dock', isFocused: true, columns: 47, titleColumns: TITLE }).tabs).toBe('row')
  })

  test('not focused, the hint says how to give the pane the keys', () => {
    for (const placement of ['dock', 'inline'] as const) {
      expect(collectionLayout({ placement, isFocused: false, columns: 120, titleColumns: TITLE }).hint).toBe(' · ctrl+x tab to use')
    }
  })

  test('the hint is left out when it doesn\'t fit after the title and the tabs beside it', () => {
    // 17 + 2 + 47 = 66 beside; " · Esc: close" is 13
    expect(collectionLayout({ placement: 'inline', isFocused: true, columns: 79, titleColumns: TITLE })).toEqual({ tabs: 'beside', hint: ' · Esc: close' })
    expect(collectionLayout({ placement: 'inline', isFocused: true, columns: 78, titleColumns: TITLE })).toEqual({ tabs: 'beside' })
    expect(collectionLayout({ placement: 'dock', isFocused: true, columns: 29, titleColumns: TITLE })).toEqual({ tabs: 'column' })
  })
})
