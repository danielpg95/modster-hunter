import { describe, expect, test } from 'claude-code/testing'
import { paneHint } from '../../hooks/render'

// Decision 0024 point 4: the hint by focus and placement, cut first when the header is narrow.

describe('paneHint', () => {
  test('focused and docked: Esc gives the keys back', () => {
    expect(paneHint({ isFocused: true, placement: 'dock', columns: 80 })).toBe(' · Esc: back to prompt')
  })

  test('focused and inline: Esc, and ctrl+x x because the close mark can\'t be clicked', () => {
    expect(paneHint({ isFocused: true, placement: 'inline', columns: 80 })).toBe(' · Esc: back to prompt · ctrl+x x: close')
  })

  test('not focused, docked or inline: ctrl+x tab', () => {
    for (const placement of ['dock', 'inline'] as const) {
      expect(paneHint({ isFocused: false, placement, columns: 80 })).toBe(' · ctrl+x tab to play')
    }
  })

  test('a narrow inline header drops the close part first, then the whole hint', () => {
    expect(paneHint({ isFocused: true, placement: 'inline', columns: 30 })).toBe(' · Esc: back to prompt')
    expect(paneHint({ isFocused: true, placement: 'inline', columns: 10 })).toBeUndefined()
  })

  test('a hint that doesn\'t fit is left out', () => {
    expect(paneHint({ isFocused: false, placement: 'dock', columns: 21 })).toBe(' · ctrl+x tab to play')
    expect(paneHint({ isFocused: false, placement: 'dock', columns: 20 })).toBeUndefined()
  })
})
