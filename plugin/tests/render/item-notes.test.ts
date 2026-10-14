import { describe, expect, test } from 'claude-code/testing'
import { itemNotes, offRow, toggleLabel } from '../../hooks/render'

// Decision 0032: `o` turns an item off and on; off rows are dimmed, the user's own say how to delete them.

describe('itemNotes', () => {
  test('the key reads Turn off for an item that is on, Turn on for one that is off', () => {
    expect(toggleLabel({})).toBe('Turn off')
    expect(toggleLabel({ isOff: true })).toBe('Turn on')
  })

  test('an off row is dimmed and ends in off; a row that is on is unchanged', () => {
    const row = [{ text: '▸ ', bold: true as const }, { text: 'Sproutling', color: '#4caf50' }]
    expect(offRow(row, {})).toBe(row)
    expect(offRow(row, { isOff: true })).toEqual([
      { text: '▸ ', bold: true, dim: true },
      { text: 'Sproutling', color: '#4caf50', dim: true },
      { text: ' off', dim: true },
    ])
  })

  test('a built-in that is on gets no notes', () => {
    expect(itemNotes('biome', 'volcano', {})).toEqual([])
  })

  test('only the user\'s own items get the delete hint, naming the kind and id', () => {
    expect(itemNotes('biome', 'volcano', { isOff: true, isYours: true })).toEqual([
      [{ text: 'Turned off', bold: true }],
      [{ text: 'Yours · to delete it, ask Claude: "delete my biome volcano"', dim: true }],
    ])
  })
})
