import { describe, expect, test } from 'claude-code/testing'
import { biomesBody } from '../../hooks/render'

// P3-03: the biome list beside the odds when both fit across, else above them in a few rows.

describe('biomesBody', () => {
  test('a wide pane puts the list beside the odds, with every row', () => {
    expect(biomesBody(120, 5)).toEqual({ split: 'side', listRows: 5 })
    expect(biomesBody(76, 5)).toEqual({ split: 'side', listRows: 5 })
  })

  test('a narrow pane stacks the list above the odds, in at most 3 rows', () => {
    expect(biomesBody(75, 20)).toEqual({ split: 'stack', listRows: 3 })
    expect(biomesBody(40, 2)).toEqual({ split: 'stack', listRows: 2 })
  })

  test('no room still keeps one row for the list', () => {
    expect(biomesBody(120, 0).listRows).toBe(1)
    expect(biomesBody(40, -1).listRows).toBe(1)
  })
})
